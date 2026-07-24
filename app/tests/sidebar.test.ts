import { expect, test } from './fixtures';

test.use({ suiteId: 'sidebar' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

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
		.getByRole('button', { name: 'Organizations' })
		.filter({ hasText: defaultOrganization.payload.name });
	await orgButton.click();

	const popoverId = await orgButton.getAttribute('aria-controls');
	const popover = page.locator(`[id="${popoverId}"]`);
	await expect(popover).toBeVisible();

	await expect(popover.getByRole('link', { name: testOrganization.payload.name })).toBeVisible();
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
		.getByRole('button', { name: 'Organizational units' })
		.filter({ hasText: 'Organizational units' });
	await orgUnitButton.click();

	const popoverId = await orgUnitButton.getAttribute('aria-controls');
	const popover = page.locator(`[id="${popoverId}"]`);
	await expect(popover).toBeVisible();

	await expect(
		popover.getByRole('link', { name: testOrganizationalUnit.payload.name })
	).toBeVisible();

	const searchInput = popover.getByRole('searchbox');
	await searchInput.fill(testOrganizationalUnit.payload.name);
	await expect(popover.getByRole('treeitem')).toHaveCount(1);

	await searchInput.fill('zzzzz_no_match');
	await expect(popover.getByRole('treeitem')).toHaveCount(0);
});

test('organizational unit dropdown navigates on click', async ({
	page,
	isMobile,
	testOrganization,
	testOrganizationalUnit
}) => {
	test.skip(isMobile, 'Sidebar hidden on mobile');

	await page.goto(`/${testOrganization.guid}/all/page`);

	const orgUnitButton = page.getByRole('button', { name: 'Organizational units' });
	await orgUnitButton.click();

	const popover = page.getByRole('tree');
	await popover.getByRole('treeitem', { name: testOrganizationalUnit.payload.name }).click();

	await page.waitForURL(new RegExp(`/${testOrganizationalUnit.guid}/`));
});
