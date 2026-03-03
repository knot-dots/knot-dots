import { expect, test } from './fixtures';

test.describe('Budget Table in Goal Detail View', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('displays budget table with three sections on budget resource data detail view', async ({
		dotsBoard,
		testGoal,
		testGoalBudget,
		testSubordinateGoal, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateGoalBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasure, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasureResourceData // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		// Verify the budget table component is visible
		const table = dotsBoard.overlay.locator.getByRole('table');
		await expect(table).toBeVisible();

		// Verify table header shows subordinate goals budget title and unit
		await expect(
			dotsBoard.overlay.locator.getByRole('heading', { name: 'Subordinate goals budget €' })
		).toBeVisible();

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
		testGoal,
		testGoalBudget,
		testSubordinateGoal,
		testSubordinateGoalBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasure,
		testSubordinateMeasureResourceData // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify year columns are present
		await expect(table.getByRole('columnheader', { name: '2025' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: '2026' })).toBeVisible();

		// Verify current budget row shows correct amounts
		const currentBudgetSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Current budget' })
		});
		const currentBudgetInput2025 = currentBudgetSection
			.locator('input[inputmode="decimal"]')
			.first();
		const currentBudgetInput2026 = currentBudgetSection
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
		const subordinateMeasureSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Subordinate measures', exact: true })
		});
		const subordinateMeasureRow = subordinateMeasureSection.locator('tr', {
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
		testGoal,
		testGoalBudget
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Add a year column using the right button
		const rightAddButton = table.locator('thead th:last-child button');
		await rightAddButton.click();

		const currentYear = new Date().getFullYear();
		await expect(table.getByRole('columnheader', { name: String(currentYear + 1) })).toBeVisible();

		// Locate the current budget row input for the new year
		const currentBudgetSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Current budget' })
		});
		const currentBudgetInput = currentBudgetSection.locator('input[inputmode="decimal"]').last();

		// Type a value and wait for debounced save
		const invalidateRequest = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
		await currentBudgetInput.fill('75000');
		await invalidateRequest;

		// Reload and verify persistence (data should be visible even when not in edit mode)
		await dotsBoard.page.reload();

		// Re-open the goal overlay after reload - the Budget section still exists
		await dotsBoard.card(testGoal.payload.title).click();

		// The Budget section should still be visible with the budget card
		const sectionAfterReload = dotsBoard.overlay.sections.filter({
			has: dotsBoard.page.getByRole('heading', { name: 'Budget' })
		});
		await sectionAfterReload.getByTitle(testGoalBudget.payload.title).click();

		const tableAfterReload = dotsBoard.overlay.locator.getByRole('table');
		const currentBudgetSectionAfterReload = tableAfterReload.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Current budget' })
		});
		const currentBudgetCellAfterReload = currentBudgetSectionAfterReload.locator('td').last();

		await expect(currentBudgetCellAfterReload).toContainText('75,000');

		// Clean up - navigate back and delete the section
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.deleteSection(sectionAfterReload);
	});

	test('add year columns via + buttons in edit mode', async ({
		dotsBoard,
		testGoal,
		testGoalBudget
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify + buttons are visible in edit mode
		const leftAddButton = table.locator('.editable-table__head-years button');
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
		testGoal,
		testGoalBudget,
		testSubordinateGoal,
		testSubordinateGoalBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testSubordinateMeasure,
		testSubordinateMeasureResourceData // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);

		// Open goal overlay and enable edit mode
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

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
		testGoal,
		testGoalBudget
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);

		// Open goal overlay and enable edit mode to add section
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Budget section so the pre-existing testGoalBudget appears
		const section = await dotsBoard.overlay.addSection('Budget');

		// Disable edit mode before opening the budget detail
		await dotsBoard.overlay.editModeToggle.uncheck();

		// Click the budget card to open the budget resource data detail view
		await section.getByTitle(testGoalBudget.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify + buttons are not visible
		const leftAddButton = table.locator('.editable-table__head-years button');
		const rightAddButton = table.locator('thead th:last-child button');
		await expect(leftAddButton).not.toBeVisible();
		await expect(rightAddButton).not.toBeVisible();

		// Verify current budget inputs are not rendered (read-only mode shows text, not inputs)
		const currentBudgetSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Current budget' })
		});
		const budgetInputs = currentBudgetSection.locator('input[inputmode="decimal"]');
		await expect(budgetInputs).not.toBeVisible();

		// Clean up - navigate back and delete the section
		await dotsBoard.overlay.backButton.click();
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.deleteSection(section);
	});
});
