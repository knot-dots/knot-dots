import { expect, test } from './fixtures';

test.use({ suiteId: 'resource-table' });

test.describe('Resource V2 Table', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('displays resource table on resource detail view', async ({
		dotsBoard,
		isMobile,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Verify the resource table is visible
		const table = dotsBoard.overlay.locator.locator('.resource-table');
		await expect(table).toBeVisible();

		// Verify table header shows resource unit
		await expect(table.getByText('€')).toBeVisible();

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
		isMobile,
		testResourceV2,
		testResourceDataBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testResourceDataPlanned, // eslint-disable-line @typescript-eslint/no-unused-vars
		testResourceDataActual, // eslint-disable-line @typescript-eslint/no-unused-vars
		testMeasure
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify year columns are present
		await expect(table.getByRole('columnheader', { name: '2025' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: '2026' })).toBeVisible();

		// Verify Budget section contains the measure with correct amounts
		const budgetRow = table.locator('.resource-table__budget-row', {
			has: dotsBoard.page.getByRole('link', { name: testMeasure.payload.title })
		});
		await expect(budgetRow).toBeVisible();
		await expect(budgetRow.locator('td').nth(0)).toContainText('10,000');
		await expect(budgetRow.locator('td').nth(1)).toContainText('15,000');

		// Verify Budget sum row
		const budgetSumRow = table.locator('.resource-table__sum-row').first();
		await expect(budgetSumRow.locator('td').nth(0)).toContainText('10,000');
		await expect(budgetSumRow.locator('td').nth(1)).toContainText('15,000');

		// Verify Planned section contains correct amounts
		const plannedRow = table.locator('.resource-table__planned-row', {
			has: dotsBoard.page.getByRole('link', { name: testMeasure.payload.title })
		});
		await expect(plannedRow).toBeVisible();
		await expect(plannedRow.locator('td').nth(0)).toContainText('8,000');
		await expect(plannedRow.locator('td').nth(1)).toContainText('12,000');

		// Verify Planned sum row
		const plannedSumRow = table.locator('.resource-table__sum-row').nth(1);
		await expect(plannedSumRow.locator('td').nth(0)).toContainText('8,000');
		await expect(plannedSumRow.locator('td').nth(1)).toContainText('12,000');

		// Verify Actual section contains correct amounts
		const actualRow = table.locator('.resource-table__actual-row', {
			has: dotsBoard.page.getByRole('link', { name: testMeasure.payload.title })
		});
		await expect(actualRow).toBeVisible();
		await expect(actualRow.locator('td').nth(0)).toContainText('7,500');
		await expect(actualRow.locator('td').nth(1)).toContainText('11,000');

		// Verify Actual sum row
		const actualSumRow = table.locator('.resource-table__sum-row').nth(2);
		await expect(actualSumRow.locator('td').nth(0)).toContainText('7,500');
		await expect(actualSumRow.locator('td').nth(1)).toContainText('11,000');
	});

	test('add year columns via + buttons in edit mode', async ({
		dotsBoard,
		isMobile,
		testResourceV2,
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Enable edit mode
		await dotsBoard.overlay.editModeToggle.check();

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
	});

	test('edit budget total values with debounced save', async ({
		dotsBoard,
		isMobile,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Enable edit mode
		await dotsBoard.overlay.editModeToggle.check();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Add a year column using the right button
		const rightAddButton = table.locator('thead th:last-child button');
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

		// Reload and verify persistence
		await dotsBoard.page.reload();

		const tableAfterReload = dotsBoard.overlay.locator.locator('.resource-table__table');
		const budgetTotalRowAfterReload = tableAfterReload.locator('tbody tr', {
			has: tableAfterReload.page().getByRole('rowheader', { name: 'Past years' })
		});
		const budgetTotalInputAfterReload = budgetTotalRowAfterReload
			.locator('input[inputmode="decimal"]')
			.last();

		await expect(budgetTotalInputAfterReload).toHaveValue('5,000');
	});

	test('edit prognosis values with debounced save', async ({
		dotsBoard,
		isMobile,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Enable edit mode
		await dotsBoard.overlay.editModeToggle.check();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Add a year column using the right button
		const rightAddButton = table.locator('thead th:last-child button');
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

		// Reload and verify persistence
		await dotsBoard.page.reload();

		const tableAfterReload = dotsBoard.overlay.locator.locator('.resource-table__table');
		const prognosisRowAfterReload = tableAfterReload.locator('tbody tr', {
			has: tableAfterReload.page().getByRole('rowheader', { name: 'Total budget forecast' })
		});
		const prognosisInputAfterReload = prognosisRowAfterReload
			.locator('input[inputmode="decimal"]')
			.last();

		await expect(prognosisInputAfterReload).toHaveValue('3,000');
	});

	test('budget/planned/actual rows link to related measure', async ({
		dotsBoard,
		isMobile,
		testResourceV2,
		testResourceDataBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testMeasure
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify the budget row has a link to the measure
		const budgetRowLink = table
			.locator('.resource-table__budget-row')
			.getByRole('link', { name: testMeasure.payload.title });
		await expect(budgetRowLink).toBeVisible();

		// Click the link to open the measure overlay
		await budgetRowLink.click();

		// Verify we're now viewing the measure
		await expect(dotsBoard.overlay.title).toHaveText(testMeasure.payload.title);
	});

	test('table inputs are read-only when not in edit mode', async ({
		dotsBoard,
		isMobile,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testResourceV2.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Navigate to resources catalog and open the resource
		await dotsBoard.page.goto(`/${testResourceV2.organization}/resources/catalog`);
		await dotsBoard.page.getByTitle(testResourceV2.payload.title).click();

		// Ensure edit mode is off
		await dotsBoard.overlay.editModeToggle.uncheck();

		const table = dotsBoard.overlay.locator.locator('.resource-table__table');

		// Verify + buttons are not visible
		const leftAddButton = table.locator('.resource-table__head-years button');
		const rightAddButton = table.locator('thead th:last-child button');
		await expect(leftAddButton).not.toBeVisible();
		await expect(rightAddButton).not.toBeVisible();

		// Verify budget total and prognosis inputs are disabled
		const budgetTotalInput = table
			.locator('tbody tr', { has: table.page().getByRole('rowheader', { name: 'Past years' }) })
			.locator('input[inputmode="decimal"]')
			.first();
		const prognosisInput = table
			.locator('tbody tr', {
				has: table.page().getByRole('rowheader', { name: 'Total budget forecast' })
			})
			.locator('input[inputmode="decimal"]')
			.first();

		await expect(budgetTotalInput).toBeDisabled();
		await expect(prognosisInput).toBeDisabled();
	});
});
