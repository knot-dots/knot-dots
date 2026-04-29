import { expect, test } from './fixtures';

test.use({ suiteId: 'navigation', storageState: 'tests/.auth/admin.json' });

// The mega-menu is rendered in the header when the current container is an
// organization or organizational unit (i.e. on workspace overview pages).
// `/strategies/catalog` is one such page, so the trigger shows the current
// workspace label "Strategies".

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
	await expect(menu.getByRole('heading', { name: 'Goal planning' })).toBeVisible();
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
