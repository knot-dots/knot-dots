import { expect, test } from './fixtures';
import { Catalog } from './catalogs';

test.use({ storageState: 'tests/.auth/admin.json' });

test('create, edit and delete help object', async ({ page, testOrganization }) => {
	const catalog = new Catalog(page);

	// Navigate to the help catalog
	await page.goto(`/${testOrganization.guid}/help/catalog`);
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
	const invalidateRequest = page.waitForRequest(/x-sveltekit-invalidated/);
	await section.getByRole('heading').fill('Test Section');
	await section.getByRole('textbox').fill('This is a test section for the help object.');
	await invalidateRequest;

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
