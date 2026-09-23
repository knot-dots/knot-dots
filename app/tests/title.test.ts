import { expect, test } from './fixtures';

test.use({ suiteId: 'title' });

test.describe('Document titles and breadcrumb', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('home page title is default organization name, breadcrumb shows only default organization link', async ({
		defaultOrganization,
		page
	}) => {
		await page.goto('/');
		await expect(page).toHaveTitle(defaultOrganization.payload.name);
		await expect(
			page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link')
		).toHaveAttribute('href', new RegExp(`\\/${defaultOrganization.guid}$`));
	});

	test('404 page title includes organization name and status', async ({ page }) => {
		await page.goto('/__this_route_should_not_exist__');
		await expect(page).toHaveTitle(/\/\s*404$/);
	});

	test('title updates to show test organization name', async ({ page, testOrganization }) => {
		// Navigate to the test organization's home page
		await page.goto(`/${testOrganization.guid}`);

		// Title should include the test organization's name
		await expect(page).toHaveTitle(testOrganization.payload.name);

		// Breadcrumb should include the organization's landing page link
		await expect(
			page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link')
		).toHaveAttribute('href', new RegExp(`\\/${testOrganization.guid}$`));
	});

	test('title and breadcrumb update switching between workspaces of organization', async ({
		page,
		testOrganization
	}) => {
		const firstBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.first()
			.getByRole('link', { name: testOrganization.payload.name });
		const lastBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.last();

		// Start at the organization's home
		await page.goto(`/${testOrganization.guid}`);
		await expect(page).toHaveTitle(testOrganization.payload.name);

		// Navigate to Goals workspace
		await page.getByRole('button', { name: 'Choose workspace', exact: true }).click();
		await page.getByRole('menuitem', { name: /^Goals\b/ }).click();
		await expect(page).toHaveTitle(/\/\s*Goals$/);
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(/^Goals\b/);

		// Navigate to Strategies workspace
		await page.getByRole('button', { name: 'Goals', exact: true }).click();
		await page.getByRole('menuitem', { name: /^Strategies\b/ }).click();
		await expect(page).toHaveTitle(/\/\s*Strategies$/);
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(/^Strategies\b/);

		// Navigate to Measures workspace
		await page.getByRole('button', { name: 'Strategies', exact: true }).click();
		await page.getByRole('menuitem', { name: /^Measures\b/ }).click();
		await expect(page).toHaveTitle(/\/\s*Measures$/);
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(/^Measures\b/);

		// Navigate to Resources workspace
		await page.getByRole('button', { name: 'Measures', exact: true }).click();
		await page.getByRole('menuitem', { name: /^Resources\b/ }).click();
		await expect(page).toHaveTitle(/\/\s*Resources$/);
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(/^Resources\b/);
	});

	test('title and breadcrumb for landing page, workspace and goal of organizational unit', async ({
		page,
		testOrganization,
		testOrganizationalUnit,
		testOrganizationalUnitGoal
	}) => {
		const firstBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.first()
			.getByRole('link', { name: testOrganization.payload.name });
		const secondBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.nth(1)
			.getByRole('link', { name: testOrganizationalUnit.payload.name });
		const lastBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.last();

		// Start at the organizational unit's home
		await page.goto(`/${testOrganizationalUnit.guid}`);
		await expect(page).toHaveTitle(new RegExp(`\\s*${testOrganizationalUnit.payload.name}$`));
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(testOrganizationalUnit.payload.name);

		// Navigate to Goals workspace
		await page.goto(`/${testOrganizationalUnit.guid}/goals/level`);
		await expect(page).toHaveTitle(/\/\s*Goals$/);
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(secondBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(/^Goals\b/);

		// Navigate to Goal
		await page.goto(`/${testOrganizationalUnit.guid}/${testOrganizationalUnitGoal.guid}`);
		await expect(page).toHaveTitle(new RegExp(`/\\s*${testOrganizationalUnitGoal.payload.title}$`));
		await expect(firstBreadcrumbItem).toBeVisible();
		await expect(secondBreadcrumbItem).toBeVisible();
		await expect(lastBreadcrumbItem).toHaveText(testOrganizationalUnitGoal.payload.title);
	});

	test('profile routes use profile workspace title segments', async ({
		page,
		defaultOrganization
	}) => {
		const firstBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.first()
			.getByRole('link', { name: defaultOrganization.payload.name });
		const lastBreadcrumbItem = page
			.getByRole('navigation', { name: 'Breadcrumb' })
			.getByRole('listitem')
			.last();

		await page.goto('/me');
		await expect(page).toHaveTitle(/\/\s*My workspace$/);
		await expect(firstBreadcrumbItem).toHaveText(defaultOrganization.payload.name);
		await expect(lastBreadcrumbItem).toHaveText('My workspace');

		await page.goto('/me/tasks');
		await expect(page).toHaveTitle(/\/\s*My Tasks$/);
		await expect(firstBreadcrumbItem).toHaveText(defaultOrganization.payload.name);
		await expect(lastBreadcrumbItem).toHaveText('My Tasks');

		await page.goto('/me/measures');
		await expect(page).toHaveTitle(/\/\s*My measures$/);
		await expect(firstBreadcrumbItem).toHaveText(defaultOrganization.payload.name);
		await expect(lastBreadcrumbItem).toHaveText('My measures');
	});
});
