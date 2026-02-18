import { expect, test } from './fixtures';

test.describe('Budget Table in Goal Detail View', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('displays budget table with three sections on budget resource data detail view', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testGoalBudget,
		testSubordinateGoal, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateGoalBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasure, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasureResourceData // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		// Verify the budget table is visible
		const table = dotsBoard.overlay.locator.locator('.resource-table');
		await expect(table).toBeVisible();

		// Verify table header shows subordinate goals budget title
		await expect(table.getByText('Subordinate goals budget')).toBeVisible();

		// Verify table header shows resource unit
		await expect(table.getByText('€')).toBeVisible();

		// Verify section headers are present
		await expect(table.getByText('Current budget')).toBeVisible();
		await expect(
			table.getByRole('columnheader', { name: 'Subordinate goals', exact: true })
		).toBeVisible();
		await expect(
			table.getByRole('columnheader', { name: 'Subordinate measures', exact: true })
		).toBeVisible();

		// Verify the parent goal is shown in the current budget section
		await expect(table.getByRole('link', { name: testGoal.payload.title })).toBeVisible();

		// Clean up - navigate back and delete the section
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.deleteSection(section);
	});

	test('displays subordinate goal and measure data with correct values', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testGoalBudget,
		testSubordinateGoal,
		testSubordinateGoalBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasure,
		testSubordinateMeasureResourceData // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify year columns are present
		await expect(table.getByRole('columnheader', { name: '2025' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: '2026' })).toBeVisible();

		// Verify current budget row shows correct amounts
		const currentBudgetInput2025 = table
			.locator('.resource-table__budget-row')
			.locator('input[inputmode="decimal"]')
			.first();
		const currentBudgetInput2026 = table
			.locator('.resource-table__budget-row')
			.locator('input[inputmode="decimal"]')
			.last();
		await expect(currentBudgetInput2025).toHaveValue('50,000');
		await expect(currentBudgetInput2026).toHaveValue('60,000');

		// Verify subordinate goal row shows correct amounts
		const subordinateGoalRow = table.locator('tr', {
			has: dotsBoard.page.getByRole('link', { name: testSubordinateGoal.payload.title })
		});
		await expect(subordinateGoalRow).toBeVisible();
		await expect(subordinateGoalRow.locator('td').nth(0)).toContainText('20,000');
		await expect(subordinateGoalRow.locator('td').nth(1)).toContainText('25,000');

		// Verify subordinate measure row shows correct amounts
		const subordinateMeasureRow = table.locator('.resource-table__measure-row', {
			has: dotsBoard.page.getByRole('link', { name: testSubordinateMeasure.payload.title })
		});
		await expect(subordinateMeasureRow).toBeVisible();
		await expect(subordinateMeasureRow.locator('td').nth(0)).toContainText('5,000');
		await expect(subordinateMeasureRow.locator('td').nth(1)).toContainText('7,000');

		// Clean up - navigate back and delete the section
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.deleteSection(section);
	});

	test('edit current budget values with debounced save', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testGoalBudget
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Add a year column using the right button
		const rightAddButton = table.locator('thead th:last-child button');
		await rightAddButton.click();

		const currentYear = new Date().getFullYear();
		await expect(
			table.getByRole('columnheader', { name: String(currentYear + 1) })
		).toBeVisible();

		// Locate the current budget row input for the new year
		const currentBudgetInput = table
			.locator('.resource-table__budget-row')
			.locator('input[inputmode="decimal"]')
			.last();

		// Type a value and wait for debounced save
		const invalidateRequest = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
		await currentBudgetInput.fill('75000');
		await invalidateRequest;

		// Reload and verify persistence
		await dotsBoard.page.reload();

		// Re-open the goal overlay after reload - the Budget section still exists
		await dotsBoard.card(testGoal.payload.title).click();
		
		// The Budget section should still be visible with the budget card
		const sectionAfterReload = dotsBoard.overlay.sections.filter({
			has: dotsBoard.page.getByRole('heading', { name: 'Budget' })
		});
		await sectionAfterReload.getByTitle(testGoalBudget.payload.title).click();

		const tableAfterReload = dotsBoard.overlay.locator.locator('.resource-table__table');
		const currentBudgetInputAfterReload = tableAfterReload
			.locator('.resource-table__budget-row')
			.locator('input[inputmode="decimal"]')
			.last();

		await expect(currentBudgetInputAfterReload).toHaveValue('75,000');

		// Clean up - navigate back and delete the section
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.deleteSection(sectionAfterReload);
	});

	test('add year columns via + buttons in edit mode', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testGoalBudget
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify + buttons are visible in edit mode
		const leftAddButton = table.locator('.resource-table__head-years button');
		const rightAddButton = table.locator('thead th:last-child button');
		await expect(leftAddButton).toBeVisible();
		await expect(rightAddButton).toBeVisible();

		// Click right + button to add a year column
		await rightAddButton.click();
		await expect(table.getByRole('columnheader', { name: '2027' })).toBeVisible();

		// Click left + button to add a year column
		await leftAddButton.click();
		await expect(table.getByRole('columnheader', { name: '2024' })).toBeVisible();

		// Disable edit mode and verify + buttons disappear
		await dotsBoard.overlay.editModeToggle.uncheck();
		await expect(leftAddButton).not.toBeVisible();
		await expect(rightAddButton).not.toBeVisible();

		// Clean up - enable edit mode, navigate back and delete the section
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.deleteSection(section);
	});

	test('subordinate goal and measure rows link to their detail views', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testGoalBudget,
		testSubordinateGoal,
		testSubordinateGoalBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasure,
		testSubordinateMeasureResourceData // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify the subordinate goal row has a link
		const goalLink = table.getByRole('link', { name: testSubordinateGoal.payload.title });
		await expect(goalLink).toBeVisible();

		// Click the link to navigate to the subordinate goal
		await goalLink.click();
		await expect(dotsBoard.overlay.title).toHaveText(testSubordinateGoal.payload.title);

		// Navigate back to the budget table
		await dotsBoard.overlay.backButton.click();

		// Verify the subordinate measure row has a link
		const measureLink = table.getByRole('link', { name: testSubordinateMeasure.payload.title });
		await expect(measureLink).toBeVisible();

		// Click the link to navigate to the subordinate measure
		await measureLink.click();
		await expect(dotsBoard.overlay.title).toHaveText(testSubordinateMeasure.payload.title);

		// Clean up - navigate back to goal budget, then back to goal, delete section
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.deleteSection(section);
	});

	test('current budget inputs are disabled when not in edit mode', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testGoalBudget
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay and enable edit mode to add section
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Disable edit mode before opening the budget detail
		await dotsBoard.overlay.editModeToggle.uncheck();

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify + buttons are not visible
		const leftAddButton = table.locator('.resource-table__head-years button');
		const rightAddButton = table.locator('thead th:last-child button');
		await expect(leftAddButton).not.toBeVisible();
		await expect(rightAddButton).not.toBeVisible();

		// Verify current budget inputs are disabled
		const budgetInputs = table
			.locator('.resource-table__budget-row')
			.locator('input[inputmode="decimal"]');
		const count = await budgetInputs.count();
		for (let i = 0; i < count; i++) {
			await expect(budgetInputs.nth(i)).toBeDisabled();
		}

		// Clean up - navigate back and delete the section
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.deleteSection(section);
	});
});
