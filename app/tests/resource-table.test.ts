import { expect, test } from './fixtures';

test.use({ suiteId: 'resource-table' });

test.describe('Resource V2 Table', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('displays resource table on resource detail view', async ({ dotsBoard, testResourceV2 }) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Verify the budget table component is visible
		const table = dotsBoard.overlay.locator.getByRole('table');
		await expect(table).toBeVisible();

		// Verify table header shows resource unit
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: '€' })).toBeVisible();

		// Verify section headers are present
		await expect(table.getByRole('columnheader', { name: 'Total budget' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: 'Budgets' })).toBeVisible();
		await expect(
			table.getByRole('columnheader', { name: 'Planned resource allocation' })
		).toBeVisible();
		await expect(
			table.getByRole('columnheader', { name: 'Actual resource allocation' })
		).toBeVisible();
	});

	test('displays pre-existing resource data in correct sections', async ({
		dotsBoard,
		testResourceV2,
		testResourceDataBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testResourceDataPlanned, // eslint-disable-line @typescript-eslint/no-unused-vars
		testResourceDataActual, // eslint-disable-line @typescript-eslint/no-unused-vars
		testMeasure
	}) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify year columns are present
		await expect(table.getByRole('columnheader', { name: '2025' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: '2026' })).toBeVisible();

		// Verify Budget section contains the measure with correct amounts
		const budgetSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Budgets' })
		});
		const budgetRow = budgetSection.locator('tr', {
			has: dotsBoard.page.getByRole('link', { name: testMeasure.payload.title })
		});
		await expect(budgetRow).toBeVisible();
		await expect(budgetRow.locator('td').nth(0)).toContainText('10,000');
		await expect(budgetRow.locator('td').nth(1)).toContainText('15,000');

		// Verify Budget sum row
		const budgetSumRow = table.locator('tr.sum').first();
		await expect(budgetSumRow.locator('td').nth(0)).toContainText('10,000');
		await expect(budgetSumRow.locator('td').nth(1)).toContainText('15,000');

		// Verify Planned section contains correct amounts
		const plannedSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Planned resource allocation' })
		});
		const plannedRow = plannedSection.locator('tr', {
			has: dotsBoard.page.getByRole('link', { name: testMeasure.payload.title })
		});
		await expect(plannedRow).toBeVisible();
		await expect(plannedRow.locator('td').nth(0)).toContainText('8,000');
		await expect(plannedRow.locator('td').nth(1)).toContainText('12,000');

		// Verify Planned sum row
		const plannedSumRow = table.locator('tr.sum').nth(1);
		await expect(plannedSumRow.locator('td').nth(0)).toContainText('8,000');
		await expect(plannedSumRow.locator('td').nth(1)).toContainText('12,000');

		// Verify Actual section contains correct amounts
		const actualSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Actual resource allocation' })
		});
		const actualRow = actualSection.locator('tr', {
			has: dotsBoard.page.getByRole('link', { name: testMeasure.payload.title })
		});
		await expect(actualRow).toBeVisible();
		await expect(actualRow.locator('td').nth(0)).toContainText('7,500');
		await expect(actualRow.locator('td').nth(1)).toContainText('11,000');

		// Verify Actual sum row
		const actualSumRow = table.locator('tr.sum').nth(2);
		await expect(actualSumRow.locator('td').nth(0)).toContainText('7,500');
		await expect(actualSumRow.locator('td').nth(1)).toContainText('11,000');
	});

	test('add year columns via + buttons in edit mode', async ({
		dotsBoard,
		testResourceV2,
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Enable edit mode
		await dotsBoard.overlay.editModeToggle.check();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify + buttons are visible in edit mode
		const leftAddButton = table
			.locator('thead')
			.getByRole('columnheader')
			.first()
			.getByRole('button');
		const rightAddButton = table
			.locator('thead')
			.getByRole('columnheader')
			.last()
			.getByRole('button');
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
	});

	test('edit budget total values with debounced save', async ({ dotsBoard, testResourceV2 }) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Enable edit mode
		await dotsBoard.overlay.editModeToggle.check();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Add a year column using the right button
		const rightAddButton = table
			.locator('thead')
			.getByRole('columnheader')
			.last()
			.getByRole('button');
		await rightAddButton.click();

		// The first year added will be the current year
		const currentYear = new Date().getFullYear();
		await expect(table.getByRole('columnheader', { name: String(currentYear + 1) })).toBeVisible();

		// Locate the "Past years" (budget total) row input for the current year
		const budgetTotalRow = table.locator('tbody tr', {
			has: table.page().getByRole('rowheader', { name: 'Past years' })
		});
		const budgetTotalInput = budgetTotalRow.locator('input[inputmode="decimal"]').last();

		// Type a value and wait for debounced save
		const invalidateRequest = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
		await budgetTotalInput.fill('5000');
		await invalidateRequest;

		// Reload and verify persistence (data should be visible even when not in edit mode)
		await dotsBoard.page.reload();

		const tableAfterReload = dotsBoard.overlay.locator.getByRole('table');
		const budgetTotalRowAfterReload = tableAfterReload.locator('tbody tr', {
			has: tableAfterReload.page().getByRole('rowheader', { name: 'Past years' })
		});
		const budgetTotalCellAfterReload = budgetTotalRowAfterReload.locator('td').last();

		await expect(budgetTotalCellAfterReload).toContainText('5,000');
	});

	test('edit prognosis values with debounced save', async ({ dotsBoard, testResourceV2 }) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Enable edit mode
		await dotsBoard.overlay.editModeToggle.check();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Add a year column using the right button
		const rightAddButton = table
			.locator('thead')
			.getByRole('columnheader')
			.last()
			.getByRole('button');
		await rightAddButton.click();

		// The first year added will be the current year
		const currentYear = new Date().getFullYear();
		await expect(table.getByRole('columnheader', { name: String(currentYear + 1) })).toBeVisible();

		// Locate the "Total budget forecast" row input for the current year
		const prognosisRow = table.locator('tbody tr', {
			has: table.page().getByRole('rowheader', { name: 'Total budget forecast' })
		});
		const prognosisInput = prognosisRow.locator('input[inputmode="decimal"]').last();

		// Type a value and wait for debounced save
		const invalidateRequest = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
		await prognosisInput.fill('3000');
		await invalidateRequest;

		// Reload and verify persistence (data should be visible even when not in edit mode)
		await dotsBoard.page.reload();

		const tableAfterReload = dotsBoard.overlay.locator.getByRole('table');
		const prognosisRowAfterReload = tableAfterReload.locator('tbody tr', {
			has: tableAfterReload.page().getByRole('rowheader', { name: 'Total budget forecast' })
		});
		const prognosisCellAfterReload = prognosisRowAfterReload.locator('td').last();

		await expect(prognosisCellAfterReload).toContainText('3,000');
	});

	test('budget/planned/actual rows link to related measure', async ({
		dotsBoard,
		testResourceV2,
		testResourceDataBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testMeasure
	}) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify the budget row has a link to the measure
		const budgetSection = table.locator('tbody', {
			has: dotsBoard.page.getByRole('columnheader', { name: 'Budgets' })
		});
		const budgetRowLink = budgetSection.getByRole('link', { name: testMeasure.payload.title });
		await expect(budgetRowLink).toBeVisible();

		// Click the link to open the measure overlay
		await budgetRowLink.click();

		// Verify we're now viewing the measure
		await expect(dotsBoard.overlay.title).toHaveText(testMeasure.payload.title);
	});

	test('table inputs are read-only when not in edit mode', async ({
		dotsBoard,
		testResourceV2
	}) => {
		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Ensure edit mode is off
		await dotsBoard.overlay.editModeToggle.uncheck();

		const table = dotsBoard.overlay.locator.getByRole('table');

		// Verify + buttons are not visible
		const leftAddButton = table
			.locator('thead')
			.getByRole('columnheader')
			.first()
			.getByRole('button');
		const rightAddButton = table
			.locator('thead')
			.getByRole('columnheader')
			.last()
			.getByRole('button');
		await expect(leftAddButton).not.toBeVisible();
		await expect(rightAddButton).not.toBeVisible();

		// Verify budget total and prognosis inputs are not rendered (read-only mode shows text, not inputs)
		const budgetTotalRow = table.locator('tbody tr', {
			has: table.page().getByRole('rowheader', { name: 'Past years' })
		});
		const prognosisRow = table.locator('tbody tr', {
			has: table.page().getByRole('rowheader', { name: 'Total budget forecast' })
		});

		await expect(budgetTotalRow.locator('input[inputmode="decimal"]')).not.toBeVisible();
		await expect(prognosisRow.locator('input[inputmode="decimal"]')).not.toBeVisible();
	});
});
