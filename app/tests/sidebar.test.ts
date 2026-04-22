import { expect, test } from './fixtures';

test.use({ suiteId: 'sidebar' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('organization dropdown shows options and filters', async ({
	page,
	isMobile,
	testOrganization,
	defaultOrganization
}) => {
	test.skip(isMobile, 'Sidebar hidden on mobile');

	// Navigate to default org so testOrganization appears in the dropdown
	await page.goto(`/${defaultOrganization.guid}/all/page`);

	const orgButton = page
		.locator('.context-select-button')
		.filter({ hasText: defaultOrganization.payload.name });
	await orgButton.click();

	const popover = page.locator('.context-select-popover').filter({ hasText: 'Organizations' });
	await expect(popover).toBeVisible();

	await expect(
		popover.locator('.context-select-option', { hasText: testOrganization.payload.name })
	).toBeVisible();

	const searchInput = popover.locator('input[type="search"]');
	await searchInput.fill(testOrganization.payload.name);
	await expect(
		popover.locator('.context-select-option', { hasText: testOrganization.payload.name })
	).toBeVisible();

	await searchInput.fill('zzzzz_no_match');
	await expect(popover.locator('.context-select-option')).toHaveCount(0);
});

test('organizational unit dropdown shows tree and filters', async ({
	page,
	isMobile,
	testOrganization,
	testOrganizationalUnit
}) => {
	test.skip(isMobile, 'Sidebar hidden on mobile');

	await page.goto(`/${testOrganization.guid}/all/page`);

	const orgUnitButton = page
		.locator('.context-select-button')
		.filter({ hasText: 'Organizational units' });
	await orgUnitButton.click();

	const popover = page
		.locator('.context-select-popover')
		.filter({ hasText: 'Organizational units' });
	await expect(popover).toBeVisible();

	await expect(
		popover.locator('.tree-item-link', { hasText: testOrganizationalUnit.payload.name })
	).toBeVisible();

	const searchInput = popover.locator('input[type="search"]');
	await searchInput.fill(testOrganizationalUnit.payload.name);
	await expect(popover.locator('.tree-item-link')).toHaveCount(1);

	await searchInput.fill('zzzzz_no_match');
	await expect(popover.locator('.tree-item-link')).toHaveCount(0);
});

test('organizational unit dropdown navigates on click', async ({
	page,
	isMobile,
	testOrganization,
	testOrganizationalUnit
}) => {
	test.skip(isMobile, 'Sidebar hidden on mobile');

	await page.goto(`/${testOrganization.guid}/all/page`);

	const orgUnitButton = page
		.locator('.context-select-button')
		.filter({ hasText: 'Organizational units' });
	await orgUnitButton.click();

	const popover = page
		.locator('.context-select-popover')
		.filter({ hasText: 'Organizational units' });
	await popover
		.locator('.tree-item-link', { hasText: testOrganizationalUnit.payload.name })
		.click();

	await page.waitForURL(new RegExp(`/${testOrganizationalUnit.guid}/`));
});
