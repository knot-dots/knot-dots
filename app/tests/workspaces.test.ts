import { expect, test } from './fixtures';

test.describe('Workspaces', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('Save filtered workspace and open it', async ({
		page,
		dotsBoard,
		defaultOrganization,
		testOrganization,
		isMobile,
		testGoal,
		testGoalWithSDG
	}) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');

		await dotsBoard.goto(`/${defaultOrganization.guid}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('CustomWorkspaces').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		const workspaceTitle = `E2E Workspace ${test.info().project.name} ${Date.now()}`;
		const baseUrl = `/${testOrganization.guid}/goals/table`;

		await page.goto(baseUrl);
		await expect(page.locator('body')).toContainText(testGoal.payload.title);
		await expect(page.locator('body')).toContainText(testGoalWithSDG.payload.title);

		await page.getByRole('button', { name: 'Filter' }).click();

		await expect(page.locator('.filter-and-sort fieldset')).toBeVisible();
		await page.getByRole('button', { name: 'SDG' }).first().click();
		const filterPanel = page.locator('.filter-and-sort');
		const invalidateRequest = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
		await filterPanel.locator('input[type="checkbox"][value="sdg.01"]').check();
		await invalidateRequest;

		await filterPanel.getByRole('button', { name: 'Save as workspace' }).click();

		await filterPanel
			.locator('.filterbar-actions .workspace-menu')
			.getByRole('button', { name: 'Save as workspace' })
			.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill(workspaceTitle);
		await Promise.all([
			page.waitForResponse(/\/container/),
			dialog.getByRole('button', { name: 'Save' }).click()
		]);
		await expect(dialog).toBeHidden();

		await page.goto(`/${testOrganization.guid}/all/catalog?payloadType=workspace`);

		const workspaceCard = page.getByRole('article', { name: workspaceTitle }).first();
		await expect(workspaceCard).toBeVisible();
		const overlay = page.locator('.overlay');
		const workspaceLink = workspaceCard.getByRole('link', { name: workspaceTitle });
		await workspaceLink.scrollIntoViewIfNeeded();
		await Promise.all([
			page.waitForURL((url) => url.hash.includes('workspace=')),
			workspaceLink.click()
		]);
		await overlay.waitFor({ state: 'visible' });
		await expect(overlay).toBeVisible();
		await expect(overlay.getByRole('link', { name: workspaceTitle })).toBeVisible();
		await expect(overlay.locator('.table-head')).toBeVisible();
		await expect(overlay).toContainText(testGoalWithSDG.payload.title);
		await expect(overlay).not.toContainText(testGoal.payload.title);
	});
});
