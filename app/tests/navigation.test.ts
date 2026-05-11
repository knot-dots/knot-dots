import { expect, test } from './fixtures';

test.use({ suiteId: 'navigation', storageState: 'tests/.auth/admin.json' });

test('workspaces mega-menu opens and navigates to selected workspace', async ({
	page,
	testOrganization
}) => {
	await page.goto(`/${testOrganization.guid}/strategies/catalog`);

	const trigger = page.getByRole('banner').getByRole('button', { name: 'Strategies', exact: true });
	await expect(trigger).toBeVisible();

	await trigger.click();

	const goalsItem = page.getByRole('menuitem', { name: /^Goals\b/ });
	await expect(goalsItem).toBeVisible();

	await goalsItem.click();

	await expect(page).toHaveURL(new RegExp(`/${testOrganization.guid}/goals(/|$)`));
	await expect(
		page.getByRole('banner').getByRole('button', { name: 'Goals', exact: true })
	).toBeVisible();
});

test('workspaces mega-menu groups workspaces by module', async ({ page, testOrganization }) => {
	await page.goto(`/${testOrganization.guid}/strategies/catalog`);

	const trigger = page.getByRole('banner').getByRole('button', { name: 'Strategies', exact: true });
	await trigger.click();

	const menu = page.getByRole('menu');
	await expect(menu).toBeVisible();

	// Module headings group the workspaces in the panel.
	await expect(menu.getByRole('heading', { name: 'Goal setting' })).toBeVisible();
	await expect(menu.getByRole('heading', { name: 'Implementation planning' })).toBeVisible();

	// Workspaces from different modules are reachable as menu items.
	await expect(menu.getByRole('menuitem', { name: /^Goals\b/ })).toBeVisible();
	await expect(menu.getByRole('menuitem', { name: /^Measures\b/ })).toBeVisible();

	// Pressing Escape closes the panel without navigating away.
	const urlBefore = page.url();
	await page.keyboard.press('Escape');
	await expect(menu).toBeHidden();
	expect(page.url()).toBe(urlBefore);
});

test('Organization menu links to workspace or landing page', async ({
	defaultOrganization,
	landingPage,
	page,
	testOrganization
}) => {
	await page.goto(`/${defaultOrganization.guid}/all/level`);

	const organizationMenuButton = page.getByRole('button', {
		name: 'Organizations and organizational units'
	});

	// Open the organization menu and verify the test organization card links to
	// the dots board.
	await organizationMenuButton.click();
	await expect(page.getByRole('link', { name: testOrganization.payload.name })).toHaveAttribute(
		'href',
		new RegExp(`/${testOrganization.guid}/all/level`)
	);

	// Ensure the measures workspace is disabled for the test organization.
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();
	await landingPage.settingsButton.click();
	await landingPage.settingsDialog.getByRole('button', { name: 'Visible workspaces' }).click();
	const saveResponse = page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await landingPage.settingsDialog.getByRole('checkbox', { name: 'All objects' }).check();
	await landingPage.settingsDialog.getByRole('checkbox', { name: 'Measures' }).uncheck();
	await saveResponse;
	await landingPage.settingsDialog.getByRole('button', { name: 'Close' }).click();

	await page.goto(`/${defaultOrganization.guid}/measures/status`);
	await expect(page).toHaveURL(new RegExp(`/${defaultOrganization.guid}/measures/status`));

	// Open the organization menu and verify the default organization card links
	// to the landing page, since the test organization does not support the
	// measures workspace.
	await organizationMenuButton.click();
	await expect(page.getByRole('link', { name: testOrganization.payload.name })).toHaveAttribute(
		'href',
		new RegExp(`/${testOrganization.guid}/all/page`)
	);
});
