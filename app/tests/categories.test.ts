import { expect, test } from './fixtures';

let sharedCategoryTitle: string;
let sharedTermNames: string[] = [];

test.describe('Categories', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test.beforeEach(async ({ defaultOrganization, dotsBoard }) => {
		await dotsBoard.goto(`/${defaultOrganization.guid}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('CustomCategories').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;
	});

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

	test('creates category with two terms', async ({ categoriesBoard, testOrganization }) => {
		sharedCategoryTitle = `E2E Category ${test.info().project.name}`;
		sharedTermNames = [
			`E2E Term A ${test.info().project.name}`,
			`E2E Term B ${test.info().project.name}`
		];

		await categoriesBoard.goto(`/${testOrganization.guid}`);
		await categoriesBoard
			.column('Categories')
			.locator.getByRole('button', { name: 'Add item' })
			.first()
			.click();
		const dialog = categoriesBoard.page.getByRole('dialog');
		await dialog.getByPlaceholder('Title').fill(sharedCategoryTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(categoriesBoard.overlay.title).toHaveText(sharedCategoryTitle);

		await categoriesBoard.overlay.editModeToggle.check();
		const termForm = categoriesBoard.overlay.locator
			.locator('form')
			.filter({ hasText: 'Create new term' });
		for (const termName of sharedTermNames) {
			await termForm.getByLabel('Title').fill(termName);
			await termForm.getByLabel('Value').fill(termName.toLowerCase().replace(/\s+/g, '-'));
			const response = categoriesBoard.page.waitForResponse(/container/);
			await termForm.getByRole('button', { name: 'Create term' }).click();
			await response;
		}

		await categoriesBoard.overlay.closeButton.click();
		await expect(categoriesBoard.column('Categories').card(sharedCategoryTitle)).toBeVisible();
		await categoriesBoard
			.column('Categories')
			.card(sharedCategoryTitle)
			.getByRole('button', { name: 'Show relations' })
			.click();
		for (const termName of sharedTermNames) {
			await expect(categoriesBoard.column('Terms').card(termName)).toBeVisible();
		}
	});

	test('assigns created term to a goal and filter by term', async ({ dotsBoard, testGoal }) => {
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.page.waitForTimeout(100);
		await dotsBoard.card(testGoal.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testGoal.payload.title);

		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.disclosePropertiesButton.click();
		await dotsBoard.overlay.locator.getByLabel(sharedCategoryTitle).click();
		await dotsBoard.overlay.locator.getByRole('checkbox', { name: sharedTermNames[0] }).check();
		await dotsBoard.overlay.closeButton.click();

		await dotsBoard.header.filterButton.click();
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
	});

	test('cleans up created category via UI', async ({ categoriesBoard, testOrganization }) => {
		await categoriesBoard.goto(`/${testOrganization.guid}`);
		await categoriesBoard.page.waitForTimeout(100);
		await categoriesBoard.column('Categories').card(sharedCategoryTitle).click();
		await expect(categoriesBoard.overlay.title).toHaveText(sharedCategoryTitle);
		await categoriesBoard.overlay.editModeToggle.check();
		await categoriesBoard.overlay.delete();
	});
});
