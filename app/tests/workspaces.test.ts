import { expect, test } from './fixtures';

test.describe('Workspaces', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('Save filtered workspace and open it', async ({
		page,
		testOrganization,
		isMobile,
		testGoal,
		testGoalWithSDG
	}) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');

		const workspaceTitle = `E2E Workspace ${test.info().project.name} ${Date.now()}`;
		const baseUrl = `/${testOrganization.guid}/goals/table`;

		await page.goto(baseUrl);

		await page.getByRole('button', { name: 'Filter' }).click();

		const filterPanel = page.locator('.filter-and-sort fieldset');
		await filterPanel.getByRole('button', { name: 'Category' }).click();
		await filterPanel.locator('input[type="checkbox"][value="sdg.01"]').check();

		await page.waitForTimeout(500);

		await filterPanel.getByRole('button', { name: 'Save as workspace' }).click();

		await filterPanel
			.locator('.filterbar-actions .workspace-menu')
			.getByRole('button', { name: 'Save as workspace' })
			.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Titel').fill(workspaceTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await page.goto(`/${testOrganization.guid}/all/catalog?payloadType=workspace`);

		const workspaceCard = page.getByRole('article', { name: workspaceTitle }).first();
		await expect(workspaceCard).toBeVisible();
		await workspaceCard.click();

		await page.waitForTimeout(500);

		await page.waitForSelector('.overlay', { state: 'visible' });

		const overlay = page.locator('.overlay');
		await expect(overlay).toBeVisible();
		await expect(overlay.getByRole('link', { name: workspaceTitle })).toBeVisible();
		await expect(overlay.locator('.table-head')).toBeVisible();
		await expect(overlay).toContainText(testGoalWithSDG.payload.title);
		await expect(overlay).not.toContainText(testGoal.payload.title);
	});
});
