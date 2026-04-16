import { expect, test } from './fixtures';
import { Catalog } from './catalogs';

test.use({ suiteId: 'help-workspace' });

test.describe('Admin users', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('create, edit and delete help object', async ({ page, defaultOrganization }) => {
		const catalog = new Catalog(page);

		// Navigate to the help catalog
		await page.goto(`/${defaultOrganization.guid}/help/catalog`);
		await catalog.header.editModeToggle.check();

		// Create a help object
		const helpTitle = 'E2E Help Object';
		await page.getByRole('paragraph').getByRole('button', { name: 'Help' }).click();
		await page.getByRole('dialog').locator('textarea').fill(helpTitle);
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		// Verify the overlay opens with the correct title
		await expect(catalog.overlay.title).toHaveText(helpTitle);

		// Add a text section
		const section = await catalog.overlay.addSection('Text');
		const saveResponse = page.waitForResponse(
			(r) => r.url().includes('/revision') && r.request().method() === 'POST'
		);
		await section.getByRole('heading').fill('Test Section');
		await section.getByRole('textbox').fill('This is a test section for the help object.');
		await saveResponse;

		// Verify section persists after reload
		await page.reload();
		await expect(section.getByRole('heading')).toHaveText('Test Section');
		await expect(section).toContainText('This is a test section for the help object.');

		// Delete the help object
		await catalog.overlay.editModeToggle.check();
		await catalog.overlay.delete();

		// Verify it is gone
		await expect(catalog.card(helpTitle)).not.toBeVisible();
	});
});

test.describe('Regular users', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('cannot see help workspace', async ({ page, defaultOrganization }) => {
		// Navigate to the organization's main page
		await page.goto(`/${defaultOrganization.guid}/all/catalog`);

		// Open the workspace menu by clicking the dropdown button
		await page.getByRole('button', { name: 'All', exact: true }).click();

		// Verify that Help is not among the available workspace options
		await expect(page.getByRole('menuitem', { name: 'Help' })).not.toBeVisible();

		// Close the menu
		await page.getByRole('button', { name: 'All', exact: true }).click();

		// Also verify that directly navigating to the help catalog page
		// doesn't show the create button since Bob lacks the permission
		await page.goto(`/${defaultOrganization.guid}/help/catalog`);

		// Bob should not see the "Help" creation button
		await expect(
			page.getByRole('paragraph').getByRole('button', { name: 'Help' })
		).not.toBeVisible();
	});
});
