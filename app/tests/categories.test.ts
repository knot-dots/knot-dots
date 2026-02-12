import { expect, test } from './fixtures';

let sharedCategoryTitle: string;
let sharedTermNames: string[] = [];

test.describe('Categories', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('shows four default categories', async ({ defaultOrganization, dotsBoard, page }) => {
		await dotsBoard.goto(`/${defaultOrganization.guid}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('CustomCategories').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		await page.goto(`/${defaultOrganization.guid}/categories`);

		const rootColumn = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { level: 2, name: 'Categories' }) });

		const defaultCategories = rootColumn
			.getByRole('article')
			.filter({ hasNotText: /^E2E Category/ });

		await expect(defaultCategories).toHaveCount(4);
	});

	test('creates category with two terms', async ({ defaultOrganization, page }) => {
		sharedCategoryTitle = `E2E Category ${test.info().project.name} ${Date.now()}`;
		sharedTermNames = [`E2E Term A ${test.info().project.name} ${Date.now()}`];

		await page.goto(`/${defaultOrganization.guid}/categories`);

		const rootColumn = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { level: 2, name: 'Categories' }) });

		await rootColumn.getByRole('button', { name: 'Add item' }).first().click();

		const dialog = page.getByRole('dialog');
		await dialog.getByPlaceholder('Title').fill(sharedCategoryTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();

		const overlay = page.locator('.overlay');
		await expect(
			overlay.getByRole('heading', { level: 1, name: sharedCategoryTitle })
		).toBeVisible();
		await overlay.getByRole('checkbox', { name: 'Edit mode', exact: true }).check();

		for (const termName of sharedTermNames) {
			await page.getByRole('button', { name: 'Create term' }).click();
			const termForm = overlay.locator('form').filter({ hasText: 'Create new term' });
			await termForm.getByLabel('Title').fill(termName);
			await termForm.getByLabel('Value').fill(termName.toLowerCase().replace(/\s+/g, '-'));
			await termForm.getByRole('button', { name: 'Create term' }).click();
		}

		await expect(rootColumn.getByRole('article', { name: sharedCategoryTitle })).toHaveCount(1);
	});

	test('assigns created term to a goal and filter by term', async ({
		defaultOrganization,
		page,
		testGoal
	}) => {
		const termName = sharedTermNames[0];

		await page.goto(`/${defaultOrganization.guid}/goals/level`);

		await page.getByRole('article', { name: testGoal.payload.title }).first().click();

		const goalOverlay = page.locator('.overlay');
		await expect(goalOverlay.getByRole('heading', { level: 1 })).toBeVisible();
		await goalOverlay.getByRole('checkbox', { name: 'Edit mode', exact: true }).check();

		const showAllButton = goalOverlay.getByRole('button', { name: 'Show all properties' });
		if (await showAllButton.isVisible()) {
			await showAllButton.click();
		}

		const categoryDropdown = goalOverlay.getByLabel(sharedCategoryTitle);
		await categoryDropdown.click();
		await goalOverlay.getByRole('checkbox', { name: termName }).check();

		await goalOverlay.getByRole('link', { name: 'Close' }).click();
		await expect(goalOverlay).toBeHidden();

		await page.getByRole('button', { name: 'Filter' }).click();

		const facetButton = page.getByRole('button', { name: sharedCategoryTitle });
		await expect(facetButton).toBeVisible();
		await facetButton.click();

		const termCheckbox = page.getByRole('checkbox', { name: termName });
		await termCheckbox.check();
		await expect(termCheckbox).toBeChecked();

		await expect(page.getByRole('article', { name: testGoal.payload.title })).toBeVisible();
	});

	test('cleans up created category via UI', async ({ defaultOrganization, page }) => {
		await page.goto(`/${defaultOrganization.guid}/categories`);

		const rootColumn = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { level: 2, name: 'Categories' }) });

		await rootColumn.getByRole('article', { name: sharedCategoryTitle }).first().click();

		const overlay = page.locator('.overlay');
		await expect(
			overlay.getByRole('heading', { level: 1, name: sharedCategoryTitle })
		).toBeVisible();
		await overlay.getByRole('checkbox', { name: 'Edit mode', exact: true }).check();

		await overlay.locator('button.delete').first().click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('button', { name: /Delete/i }).click();

		await expect(rootColumn.getByRole('article', { name: sharedCategoryTitle })).toHaveCount(0);
	});
});
