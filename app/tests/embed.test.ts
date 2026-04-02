import { expect, test } from './fixtures';

test.use({ suiteId: 'embed' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('embed route renders public report without header or properties', async ({
	page,
	testPublicReport,
	testOrganization
}) => {
	await page.goto(`/${testOrganization.guid}/${testPublicReport.guid}/embed`);

	const embedMain = page.locator('.embed-main');
	await expect(embedMain).toBeVisible();

	// Report title is visible
	await expect(embedMain).toContainText(testPublicReport.payload.title);

	// Header, action buttons, and help widget are hidden
	await expect(page.locator('header[role="banner"]')).not.toBeVisible();
	await expect(page.locator('.help-widget')).not.toBeVisible();

	// Properties section is hidden
	await expect(page.locator('#properties-label')).not.toBeVisible();
});

test('embed route returns 404 for non-public container', async ({
	page,
	testGoal,
	testOrganization
}) => {
	const response = await page.goto(`/${testOrganization.guid}/${testGoal.guid}/embed`);

	expect(response?.status()).toBe(404);
});

test('links in embed view are not navigable', async ({
	page,
	testPublicReport,
	testOrganization
}) => {
	await page.goto(`/${testOrganization.guid}/${testPublicReport.guid}/embed`);

	const embedMain = page.locator('.embed-main');
	await expect(embedMain).toBeVisible();

	// All links should have default cursor (navigation disabled)
	const links = embedMain.locator('a');
	const linkCount = await links.count();

	for (let i = 0; i < Math.min(linkCount, 3); i++) {
		await expect(links.nth(i)).toHaveCSS('cursor', 'default');
	}
});
