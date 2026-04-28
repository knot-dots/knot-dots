import { expect, test } from './fixtures';

test.use({ suiteId: 'categories' });

test.describe('Categories', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

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

	test('custom categories can be created and used as filter', async ({
		categoriesBoard,
		dotsBoard,
		testGoal,
		testCategoryWithTerms
	}) => {
		const sharedCategoryTitle = testCategoryWithTerms.category.payload.title;
		const sharedTermNames = testCategoryWithTerms.termNames;

		await categoriesBoard.goto(`/${testGoal.organization}`);
		await categoriesBoard.column('Categories').card(sharedCategoryTitle).click();
		await expect(categoriesBoard.overlay.title).toHaveText(sharedCategoryTitle);
		await categoriesBoard.overlay.closeButton.click();
		await expect(categoriesBoard.column('Categories').card(sharedCategoryTitle)).toBeVisible();
		await categoriesBoard
			.column('Categories')
			.card(sharedCategoryTitle)
			.getByRole('button', { name: 'Show relations' })
			.click();
		await categoriesBoard.page.waitForURL(/\/categories\?related-to=/);
		for (const termName of sharedTermNames) {
			await expect(categoriesBoard.column('Terms').card(termName)).toBeVisible();
		}

		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.page.waitForTimeout(100);
		await dotsBoard.card(testGoal.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testGoal.payload.title);

		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.disclosePropertiesButton.click();
		await dotsBoard.overlay.locator.getByLabel(sharedCategoryTitle).click();
		await dotsBoard.overlay.locator.getByRole('checkbox', { name: sharedTermNames[0] }).check();
		const saveResponse = dotsBoard.page.waitForResponse((r) => r.url().includes('/revision'));
		await saveResponse;
		await dotsBoard.overlay.closeButton.click();

		await dotsBoard.page.reload();

		await dotsBoard.page.getByRole('button', { name: 'Filter' }).click();
		await dotsBoard.page.getByRole('button', { name: sharedCategoryTitle }).click();
		const firstFilterResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('checkbox', { name: sharedTermNames[0] }).check();
		await firstFilterResponse;
		await expect(dotsBoard.card(testGoal.payload.title)).toBeVisible();

		const secondFilterResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('checkbox', { name: sharedTermNames[0] }).uncheck();
		await dotsBoard.page.getByRole('checkbox', { name: sharedTermNames[1] }).check();
		await secondFilterResponse;
		await expect(dotsBoard.card(testGoal.payload.title)).not.toBeVisible();

		await categoriesBoard.goto(`/${testGoal.organization}`);
		await categoriesBoard.page.waitForTimeout(100);
		await categoriesBoard.column('Categories').card(sharedCategoryTitle).click();
		await expect(categoriesBoard.overlay.title).toHaveText(sharedCategoryTitle);
	});
});
