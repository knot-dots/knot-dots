import { expect, test } from './fixtures';

// These tests verify that the document title updates correctly
// based on the organization and workspace context.

test.describe('Document titles', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('home page title includes organization and workspace (All)', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/\/\s*All$/);
	});

	test('404 page title includes organization name and status', async ({ page }) => {
		await page.goto('/__this_route_should_not_exist__');
		await expect(page).toHaveTitle(/\/\s*404$/);
	});

	test('title updates to show test organization name', async ({ page, testOrganization }) => {
		// Navigate to the test organization's home page
		await page.goto(`/${testOrganization.guid}/all/page`);

		// Title should include the test organization's name
		const expectedOrgName = testOrganization.payload.name;
		await expect(page).toHaveTitle(new RegExp(`^${expectedOrgName}\\s*/`));
	});

	test('title updates when switching between workspaces', async ({ page, testOrganization }) => {
		// Start at the organization's home (All workspace)
		await page.goto(`/${testOrganization.guid}/all/page`);
		await expect(page).toHaveTitle(/\/\s*All$/);

		// Navigate to Goals workspace
		await page.getByRole('button', { name: 'All', exact: true }).click();
		await page.getByRole('menuitem', { name: 'Goals' }).click();
		await expect(page).toHaveTitle(/\/\s*Goals$/);

		// Navigate to Programs workspace
		await page.getByRole('button', { name: 'Goals', exact: true }).click();
		await page.getByRole('menuitem', { name: 'Programs' }).click();
		await expect(page).toHaveTitle(/\/\s*Programs$/);

		// Navigate to Measures workspace
		await page.getByRole('button', { name: 'Programs', exact: true }).click();
		await page.getByRole('menuitem', { name: 'Measures' }).click();
		await expect(page).toHaveTitle(/\/\s*Measures$/);
	});

	test('profile routes use profile workspace title segments', async ({ page }) => {
		await page.goto('/me');
		await expect(page).toHaveTitle(/\/\s*My workspace$/);

		await page.goto('/me/tasks');
		await expect(page).toHaveTitle(/\/\s*My Tasks$/);

		await page.goto('/me/measures');
		await expect(page).toHaveTitle(/\/\s*My measures$/);
	});
});
