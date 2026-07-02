import { expect, test } from './fixtures';

test.use({ suiteId: 'bulk-actions' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('selecting objects for bulk actions in board and overlay', async ({
	dotsBoard,
	testGoal,
	testMeasure,
	testProgram,
	isMobile
}) => {
	test.skip(isMobile, 'Workspace menu is not visible on mobile');
	await dotsBoard.goto(`/${testGoal.organization}`);
	await dotsBoard.header.editModeToggle.check();

	// Select two cards for bulk actions by clicking on their bulk-action
	// checkbox.
	await dotsBoard.card(testProgram.payload.title).hover();
	await dotsBoard
		.card(testProgram.payload.title)
		.getByRole('checkbox', { name: 'Select for bulk action' })
		.check();
	await expect(dotsBoard.header.bulkActionControls).toBeVisible();
	await expect(
		dotsBoard.header.bulkActionControls.getByRole('checkbox', { name: 'Select all', exact: true })
	).toBeVisible();
	await expect(
		dotsBoard.header.bulkActionControls.getByText('1 selected', { exact: true })
	).toBeVisible();
	await dotsBoard.card(testGoal.payload.title).hover();
	await dotsBoard
		.card(testGoal.payload.title)
		.getByRole('checkbox', { name: 'Select for bulk action' })
		.check();
	await expect(
		dotsBoard.header.bulkActionControls.getByText('2 selected', { exact: true })
	).toBeVisible();

	// Select all cards for bulk actions by clicking on the select-all checkbox.
	await dotsBoard.header.bulkActionControls
		.getByRole('checkbox', { name: 'Select all', exact: true })
		.click();
	await expect(
		dotsBoard.header.bulkActionControls.getByText('3 selected', { exact: true })
	).toBeVisible();

	// Clear selection by clicking on the select-all checkbox again.
	await dotsBoard.header.bulkActionControls
		.getByRole('checkbox', { name: 'Clear selection', exact: true })
		.click();
	await expect(
		dotsBoard.header.bulkActionControls.getByRole('checkbox', { name: 'Select all', exact: true })
	).toBeVisible();
	await expect(dotsBoard.card(testProgram.payload.title).getByRole('checkbox')).not.toBeVisible();
	await expect(dotsBoard.card(testGoal.payload.title).getByRole('checkbox')).not.toBeVisible();
	await expect(dotsBoard.card(testMeasure.payload.title).getByRole('checkbox')).not.toBeVisible();

	// Open the test program table view in overlay.
	await dotsBoard.card(testProgram.payload.title).click();
	await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
	await dotsBoard.overlay.locator.getByRole('button', { name: 'Page', exact: true }).click();
	await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Table', exact: true }).click();

	// Assert the bulk-action checkbox works in the overlay, too.
	const row = dotsBoard.overlay.locator
		.getByRole('row')
		.filter({ hasText: testMeasure.payload.title });
	await expect(row).toBeVisible();
	await row.getByRole('checkbox', { name: 'Select for bulk action' }).check();
	await expect(dotsBoard.overlay.bulkActionControls).toBeVisible();

	// Assert the bulk-action selections in the board and overlay are independent
	// of each other.
	await expect(dotsBoard.card(testMeasure.payload.title).getByRole('checkbox')).not.toBeVisible();
});

test('perform bulk actions', async ({ allTable, testMeasure, testProgram }) => {
	await allTable.goto(`/${testMeasure.organization}`);
	await allTable.header.editModeToggle.check();

	// Select two rows for bulk actions by clicking on their bulk-action
	// checkbox.
	const programRow = allTable.page.getByRole('row').filter({ hasText: testProgram.payload.title });
	const measureRow = allTable.page.getByRole('row').filter({ hasText: testMeasure.payload.title });

	// Verify all rows have visibility "Members of organization"
	await expect(programRow.getByRole('cell', { name: 'Members of the organization' })).toBeVisible();
	await expect(measureRow.getByRole('cell', { name: 'Members of the organization' })).toBeVisible();

	// Select both rows for bulk actions and perform change visibility action.
	await programRow.hover();
	await programRow.getByRole('checkbox', { name: 'Select for bulk action' }).check();
	await measureRow.getByRole('checkbox', { name: 'Select for bulk action' }).check();
	await allTable.header.bulkActionControls.getByRole('button', { name: 'Visibility' }).click();
	await allTable.header.bulkActionControls.getByRole('radio', { name: 'Public' }).click();

	// Verify both rows are updated.
	await expect(allTable.page.getByRole('status')).toHaveText('2 objects updated');
	await expect(programRow.getByRole('cell', { name: 'Public' })).toBeVisible();
	await expect(measureRow.getByRole('cell', { name: 'Public' })).toBeVisible();
});
