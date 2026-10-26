import type { Page } from '@playwright/test';
import Header from './header';
import { expect, test } from './fixtures';

test.use({ suiteId: 'navigation', storageState: 'tests/.auth/orgadmin.json' });

test('workspaces mega-menu opens and navigates to selected workspace', async ({
	page,
	testOrganization
}) => {
	const header = new Header(page);
	await page.goto(`/${testOrganization.guid}/strategies/catalog`);

	await header.selectWorkspace('Strategies', /^Goals\b/);

	await expect(page).toHaveURL(new RegExp(`/${testOrganization.guid}/goals(/|$)`));
	await expect(header.locator.getByRole('button', { name: 'Goals', exact: true })).toBeVisible();
});

test('workspaces mega-menu groups workspaces by module', async ({ page, testOrganization }) => {
	const header = new Header(page);
	await page.goto(`/${testOrganization.guid}/strategies/catalog`);

	const menu = await header.openWorkspaceMenu('Strategies');

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
	isMobile,
	landingPage,
	page,
	testOrganization
}) => {
	test.skip(isMobile, 'Sidebar is not visible on mobile');

	await page.goto(`/${defaultOrganization.guid}/dots`);

	const nav = page.getByRole('navigation');

	// Open the sidebar organization, select and verify the test organization
	// link points to the dots board.
	await nav.getByRole('button', { name: 'Organizations' }).click();
	await expect(page.getByRole('link', { name: testOrganization.payload.name })).toHaveAttribute(
		'href',
		new RegExp(`/${testOrganization.guid}/dots`)
	);
	await page.keyboard.press('Escape');

	// Ensure the measures workspace is disabled for the test organization.
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();
	await landingPage.sidebar.openAdministrationMenu(landingPage.sidebar.organizationPanel);
	await landingPage.sidebar.locator.getByRole('menuitem', { name: 'Configuration' }).click();
	await landingPage.page
		.getByRole('dialog')
		.getByRole('button', { name: 'Visible workspaces' })
		.click();
	const saveResponse = page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await landingPage.page.getByRole('dialog').getByRole('checkbox', { name: 'All objects' }).check();
	await landingPage.page.getByRole('dialog').getByRole('checkbox', { name: 'Measures' }).uncheck();
	await saveResponse;
	await landingPage.page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

	await page.goto(`/${defaultOrganization.guid}/measures/status`);
	await expect(page).toHaveURL(new RegExp(`/${defaultOrganization.guid}/measures/status`));

	// Open the sidebar organization, select and verify the test organization
	// link points to the landing page, since it does not support the measures
	// workspace.
	await nav.getByRole('button', { name: 'Organizations' }).click();
	await expect(page.getByRole('link', { name: testOrganization.payload.name })).toHaveAttribute(
		'href',
		new RegExp(`/${testOrganization.guid}`)
	);
});

test.describe('Loading feedback', () => {
	// Holds back the data of the next page until the returned function is called
	async function holdPageData(page: Page) {
		let release!: () => void;
		const released = new Promise<void>((resolve) => (release = resolve));
		await page.route('**/__data.json*', async (route) => {
			await released;
			await route.continue();
		});
		return release;
	}

	test('a progress bar runs while another page loads', async ({ page, testOrganization }) => {
		const header = new Header(page);
		await page.goto(`/${testOrganization.guid}/strategies/catalog`);
		await page.waitForLoadState('networkidle');
		const release = await holdPageData(page);

		await header.selectWorkspace('Strategies', /^Goals\b/);

		await expect(page.getByRole('progressbar', { name: 'Loading…' })).toBeVisible();
		release();
		await expect(page).toHaveURL(new RegExp(`/${testOrganization.guid}/goals(/|$)`));
		await expect(page.getByRole('progressbar', { name: 'Loading…' })).toHaveCount(0);
	});

	test('results are dimmed while a filter is applied', async ({ page, testGoal }) => {
		await page.goto(`/${testGoal.organization}/goals/catalog`);
		await page.waitForLoadState('networkidle');
		const release = await holdPageData(page);

		await page.getByRole('button', { name: 'Status' }).click();
		const option = page.getByRole('checkbox', { name: /^Idea/ });
		await option.check();

		await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true');
		await expect(page.getByRole('progressbar', { name: 'Loading…' })).toBeVisible();
		await expect(option).toBeEnabled();
		release();
		await expect(page).toHaveURL(/status=status.idea/);
		await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
		await expect(page.getByRole('progressbar', { name: 'Loading…' })).toHaveCount(0);
	});
});
