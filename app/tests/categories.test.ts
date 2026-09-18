import { expect, test } from './fixtures';

test.use({ suiteId: 'categories' });

test.describe('Categories', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('shows four default categories', async ({ defaultOrganization, page }) => {
		await page.goto(`/${defaultOrganization.guid}/categories`);

		const rootColumn = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { level: 2, name: 'Categories' }) });

		const defaultCategories = rootColumn
			.getByRole('article')
			.filter({ hasNotText: /^E2E Category/ });

		await expect(defaultCategories).toHaveCount(4);
	});

	test('custom categories can be used as filter', async ({
		goalsBoard,
		testGoal,
		testCategoryWithTerms
	}) => {
		const sharedCategoryTitle = testCategoryWithTerms.category.payload.title;
		const sharedTermNames = testCategoryWithTerms.termNames;

		const openSharedCategoryFilter = async () => {
			const termCheckbox = goalsBoard.page.getByRole('checkbox', { name: sharedTermNames[0] });
			if (await termCheckbox.isVisible()) {
				return;
			}

			const categoryButton = goalsBoard.page.getByRole('button', { name: sharedCategoryTitle });
			if (!(await categoryButton.isVisible())) {
				await goalsBoard.page.getByRole('button', { name: 'Filter' }).click();
			}
			if (!(await termCheckbox.isVisible())) {
				await categoryButton.click();
			}
		};

		await goalsBoard.goto(`/${testGoal.organization}`);
		await expect(goalsBoard.card(testGoal.payload.title)).toBeVisible();
		await goalsBoard.card(testGoal.payload.title).click();
		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);

		await goalsBoard.overlay.editModeToggle.check();
		await goalsBoard.overlay.disclosePropertiesButton.click();
		await goalsBoard.overlay.locator.getByLabel(sharedCategoryTitle).click();
		const saveResponse = goalsBoard.page.waitForResponse((r) => r.url().includes('/revision'));
		await goalsBoard.overlay.locator.getByRole('checkbox', { name: sharedTermNames[0] }).check();
		await saveResponse;
		await goalsBoard.overlay.closeButton.click();
		await expect(goalsBoard.overlay.locator).not.toBeVisible();

		await goalsBoard.page.reload();

		await openSharedCategoryFilter();
		await goalsBoard.page.getByRole('checkbox', { name: sharedTermNames[0] }).check();
		await expect(goalsBoard.card(testGoal.payload.title)).toBeVisible();

		await openSharedCategoryFilter();
		await goalsBoard.page.getByRole('checkbox', { name: sharedTermNames[0] }).uncheck();
		await goalsBoard.page.getByRole('checkbox', { name: sharedTermNames[1] }).check();
		await expect(goalsBoard.card(testGoal.payload.title)).not.toBeVisible();
	});
});
