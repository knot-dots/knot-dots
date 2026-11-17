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
	await page.goto(`/${defaultOrganization.guid}`);

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

	await page.goto(`/${testOrganization.guid}`);

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

	await page.goto(`/${testOrganization.guid}`);

	const orgUnitButton = page.getByRole('button', { name: 'Organizational units' });
	await orgUnitButton.click();

	const popover = page.getByRole('tree');
	await popover.getByRole('treeitem', { name: testOrganizationalUnit.payload.name }).click();

	await page.waitForURL(new RegExp(`/${testOrganizationalUnit.guid}`));
});

test('users can manage their own favorites', async ({ dotsBoard, isMobile, testOrganization }) => {
	await dotsBoard.goto(`/${testOrganization.guid}`);

	if (isMobile) {
		await dotsBoard.sidebar.burgerMenu.click();
	}

	await expect(dotsBoard.sidebar.userPanel.getByRole('link', { name: 'dots' })).not.toBeVisible();
	await expect(dotsBoard.header.userFavoriteToggle).toHaveAccessibleName('Add to sidebar');
	await dotsBoard.header.userFavoriteToggle.click();
	await expect(dotsBoard.header.userFavoriteToggle).toHaveAccessibleName('Remove from sidebar');
	await expect(dotsBoard.sidebar.userPanel.getByRole('link', { name: 'dots' })).toBeVisible();
	await dotsBoard.header.userFavoriteToggle.click();
	await expect(dotsBoard.sidebar.userPanel.getByRole('link', { name: 'dots' })).not.toBeVisible();
});

test('organization admins can toggle favorites of the organization', async ({
	dotsBoard,
	isMobile,
	testOrganization
}) => {
	test.skip(isMobile, 'Sidebar hidden on mobile');

	const { header, page, sidebar } = dotsBoard;
	const favorites = sidebar.favorites(sidebar.organizationPanel);
	const path = `/${testOrganization.guid}/goals/level`;

	await page.goto(path);
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveCount(0);

	await header.toggleFavorite('Add to sidebar');
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveAttribute(
		'href',
		new URL(path, page.url()).toString()
	);

	// The stored favorite is recognized as that of the page after reloading it.
	await page.reload();
	await header.toggleFavorite('Remove from sidebar');
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveCount(0);

	await page.reload();
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveCount(0);
});

test('organization admins can toggle favorites of an organizational unit', async ({
	dotsBoard,
	isMobile,
	testOrganization,
	testOrganizationalUnit
}) => {
	test.skip(isMobile, 'Sidebar hidden on mobile');

	const { header, page, sidebar } = dotsBoard;
	const favorites = sidebar.favorites(sidebar.organizationalUnitPanel);
	const path = `/${testOrganizationalUnit.guid}/goals/level`;

	await page.goto(path);
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveCount(0);

	await header.toggleFavorite('Add to sidebar');
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveAttribute(
		'href',
		new URL(path, page.url()).toString()
	);

	// The favorite belongs to the organizational unit, not to the organization.
	await page.goto(`/${testOrganization.guid}/goals/level`);
	await expect(
		sidebar.favorites(sidebar.organizationPanel).filter({ hasText: 'Goals' })
	).toHaveCount(0);

	// The stored favorite is recognized as that of the page after returning to it.
	await page.goto(path);
	await header.toggleFavorite('Remove from sidebar');
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveCount(0);

	await page.reload();
	await expect(favorites.filter({ hasText: 'Goals' })).toHaveCount(0);
});

test('organization admins can reorder favorites of the organization', async ({
	dotsBoard,
	isMobile,
	testOrganization
}) => {
	test.skip(isMobile, 'Drag-and-drop is not supported on mobile');

	const { header, page, sidebar } = dotsBoard;
	const favorites = sidebar.favorites(sidebar.organizationPanel);
	const goals = favorites.filter({ hasText: 'Goals' });
	const measures = favorites.filter({ hasText: 'Measures' });

	await page.goto(`/${testOrganization.guid}/goals/level`);
	await header.toggleFavorite('Add to sidebar');
	await page.goto(`/${testOrganization.guid}/measures/catalog`);
	await header.toggleFavorite('Add to sidebar');
	await expect(favorites).toHaveText(['Goals', 'Measures']);

	await header.editModeToggle.check();
	await sidebar.moveFavorite(measures, goals);
	await expect(favorites).toHaveText(['Measures', 'Goals']);
	await header.editModeToggle.uncheck();

	// The reordered favorites keep linking to their pages and are recognized as theirs.
	await page.reload();
	await expect(favorites).toHaveText(['Measures', 'Goals']);
	await goals.click();
	await page.waitForURL(`**/${testOrganization.guid}/goals/level`);
	await header.toggleFavorite('Remove from sidebar');
	await measures.click();
	await page.waitForURL(`**/${testOrganization.guid}/measures/catalog`);
	await header.toggleFavorite('Remove from sidebar');
	await expect(favorites).toHaveCount(0);
});
