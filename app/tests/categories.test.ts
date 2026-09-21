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

	test('a category with terms and subterms can be created through the UI', async ({
		categoriesBoard,
		testOrganization
	}) => {
		const { page, overlay } = categoriesBoard;

		const categoryTitle = 'Köppen climate classification';
		const termNames = ['Tropical', 'Arid'];
		const subtermNames = [
			['Tropical rainforest', 'Tropical monsoon'],
			['Hot desert', 'Cold desert']
		];

		async function createTerm(title: string, isFirst: boolean) {
			if (isFirst) {
				await overlay.locator.getByRole('button', { name: 'Create term' }).first().click();
			} else {
				const lastTerm = overlay.locator
					.locator('li')
					.filter({ has: page.getByRole('heading', { level: 2 }) })
					.last();
				await lastTerm.hover();
				await lastTerm.getByRole('button', { name: 'Create term' }).click();
			}

			const form = overlay.locator.locator('form').filter({ has: page.getByPlaceholder('Title') });
			await form.getByPlaceholder('Title').fill(title);

			const relationSaved = page.waitForResponse(
				(response) =>
					/\/container\/[^/]+\/relation$/.test(response.url()) &&
					response.request().method() === 'POST'
			);
			await form.locator('button[type="submit"]', { hasText: 'Create term' }).click();
			await relationSaved;

			await expect(overlay.locator.getByRole('heading', { level: 2, name: title })).toBeVisible();
		}

		// Create the category via the workspace "Add item" dialog
		await categoriesBoard.goto(`/${testOrganization.guid}`);
		await categoriesBoard.column('Categories').addItemButton.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('textbox', { name: 'Title' }).fill(categoryTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();

		await expect(overlay.title).toHaveText(categoryTitle);

		// Switch to edit mode so terms can be added.
		await overlay.editModeToggle.check();

		// Add two terms to the category
		await createTerm(termNames[0], true);
		await createTerm(termNames[1], false);

		// Add two subterms to each term
		for (const [index, termName] of termNames.entries()) {
			await overlay.locator.getByRole('link', { name: termName }).click();
			await expect(overlay.title).toHaveText(termName);

			// Edit mode is a global application state, so it persists here.
			await createTerm(subtermNames[index][0], true);
			await createTerm(subtermNames[index][1], false);

			await overlay.backButton.click();
			await expect(overlay.title).toHaveText(categoryTitle);
		}

		await overlay.closeButton.click();
		await expect(overlay.locator).not.toBeVisible();

		// Verify the created hierarchy shows up in the workspace
		await categoriesBoard.goto(`/${testOrganization.guid}`);

		await expect(categoriesBoard.column('Categories').card(categoryTitle)).toBeVisible();
		for (const termName of termNames) {
			await expect(categoriesBoard.column('Terms').card(termName)).toBeVisible();
		}
		for (const subtermName of subtermNames.flat()) {
			await expect(categoriesBoard.column('Sub-terms').card(subtermName)).toBeVisible();
		}

		// Selecting a card filters the related containers by hierarchy
		await categoriesBoard
			.column('Terms')
			.card(termNames[0])
			.getByRole('button', { name: 'Show relations' })
			.click();

		// Only the selected term, its category and its descendants remain visible.
		await expect(categoriesBoard.column('Categories').card(categoryTitle)).toBeVisible();
		await expect(categoriesBoard.column('Terms').card(termNames[0])).toBeVisible();
		await expect(categoriesBoard.column('Terms').card(termNames[1])).not.toBeVisible();

		for (const subtermName of subtermNames[0]) {
			await expect(categoriesBoard.column('Sub-terms').card(subtermName)).toBeVisible();
		}

		for (const subtermName of subtermNames[1]) {
			await expect(categoriesBoard.column('Sub-terms').card(subtermName)).not.toBeVisible();
		}
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
