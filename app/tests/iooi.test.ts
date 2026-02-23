import { expect, test } from './fixtures';

test.describe('Goal IOOI Board', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('can navigate to goal IOOI board from overlay', async ({
		dotsBoard,
		isMobile,
		testGoal
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open goal overlay
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify IOOI board columns are visible
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Input' })).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Output' })).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Outcome' })).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Impact' })).toBeVisible();
	});

	test('displays existing objective in correct IOOI column', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testObjective
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open goal overlay
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify objective appears in the Output column (default iooiType)
		const outputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Output' });
		await expect(outputColumn.getByTitle(testObjective.payload.title)).toBeVisible();
	});

	['Output', 'Outcome', 'Impact'].forEach((iooiType) => {
		test(`can create objective in ${iooiType} column`, async ({
			dotsBoard,
			isMobile,
			testGoal,
			testIndicator
		}) => {
			test.skip(isMobile, 'Feature cannot be enabled on mobile');

			// Open goal overlay and enable edit mode
			await dotsBoard.goto(`/${testGoal.organization}`);
			await dotsBoard.card(testGoal.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();

			// Navigate to IOOI workspace
			await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
			await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

			// Create new objective in Output column
			const column = dotsBoard.overlay.locator.locator('section', { hasText: iooiType });
			await column.getByRole('button', { name: 'Add item' }).first().click();

			// Select indicator from catalog
			await dotsBoard.overlay.locator
				.getByRole('article', { name: testIndicator.payload.title })
				.getByRole('button', { name: 'Select this template' })
				.click();

			// Verify the objective was created and overlay is showing it
			await expect(dotsBoard.overlay.title).toHaveText(testIndicator.payload.title);

			// Go back to IOOI board and verify objective is in Output column
			await dotsBoard.page.goto(`/${testGoal.organization}#goal-iooi=${testGoal.guid}`);
			await expect(column.getByTitle(testIndicator.payload.title)).toBeVisible();

			// Delete the created objective
			await column.getByTitle(testIndicator.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(testIndicator.payload.title);
			await dotsBoard.overlay.editModeToggle.check();
			await dotsBoard.overlay.delete();
		});
	});

	test('Input column shows add button for budget in goal IOOI board', async ({
		dotsBoard,
		isMobile,
		testGoal
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open goal overlay and enable edit mode
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify Input column has add item button (not dropdown since goals only have one option)
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await expect(inputColumn.getByRole('button', { name: 'Add item' }).first()).toBeVisible();
	});

	test('can create budget resource data in Input column for goal', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open goal overlay and enable edit mode
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Create new resource data in Input column
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await inputColumn.getByRole('button', { name: 'Add item' }).first().click();

		// Select the resource from the grouped dropdown
		const dialog = dotsBoard.page.getByRole('dialog');
		await dialog.getByLabel('Resource').click();
		await dialog.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) }).check();

		// Fill in the title
		const resourceDataTitle = `Budget Item ${Date.now()}`;
		await dialog.getByRole('textbox', { name: 'Title' }).fill(resourceDataTitle);

		// Save the item
		await dialog.getByRole('button', { name: 'Save' }).click();

		// Verify redirect to resource data overlay
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);

		// Navigate back to IOOI board
		await dotsBoard.page.goto(`/${testGoal.organization}#goal-iooi=${testGoal.guid}`);

		// Verify resource data appears in Input column
		await expect(inputColumn.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - delete the created resource data and auto-created section
		await inputColumn.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();

		// Go to main overlay view to delete the auto-created section
		await dotsBoard.page.goto(`/${testGoal.organization}#view=${testGoal.guid}`);
		await dotsBoard.overlay.editModeToggle.check();
		const budgetSection = dotsBoard.overlay.sections.filter({
			hasText: 'Budget'
		});
		if ((await budgetSection.count()) > 0) {
			await dotsBoard.overlay.deleteSection(budgetSection.first());
		}
	});

	test('automatically creates resource data collection section when adding resource data from Input column', async ({
		dotsBoard,
		isMobile,
		testGoal,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open goal overlay and enable edit mode
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Clean up any existing budget section to ensure clean test state
		const existingBudgetSection = dotsBoard.overlay.sections.filter({ hasText: 'Budget' });
		if ((await existingBudgetSection.count()) > 0) {
			await dotsBoard.overlay.deleteSection(existingBudgetSection.first());
		}

		// Verify no budget section exists now
		await expect(dotsBoard.overlay.sections.filter({ hasText: 'Budget' })).toHaveCount(0);

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Create new resource data in Input column
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await inputColumn.getByRole('button', { name: 'Add item' }).first().click();

		// Select the resource from the grouped dropdown
		const dialog = dotsBoard.page.getByRole('dialog');
		await dialog.getByLabel('Resource').click();
		await dialog.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) }).check();

		// Fill in the title
		const resourceDataTitle = `Budget Item ${Date.now()}`;
		await dialog.getByRole('textbox', { name: 'Title' }).fill(resourceDataTitle);

		// Save the item
		await dialog.getByRole('button', { name: 'Save' }).click();

		// Wait for redirect to resource data overlay
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);

		// Navigate back to main overlay view
		await dotsBoard.page.goto(`/${testGoal.organization}#view=${testGoal.guid}`);

		// Verify budget section was automatically created
		const budgetSection = dotsBoard.overlay.sections.filter({ hasText: 'Budget' });
		await expect(budgetSection).toHaveCount(1);

		// Verify the resource data item is in the section
		await expect(budgetSection.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - delete the resource data and section
		await budgetSection.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();
		await dotsBoard.overlay.deleteSection(budgetSection);
	});
});

test.describe('Measure IOOI Board', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('can navigate to measure IOOI board from overlay', async ({
		dotsBoard,
		isMobile,
		testMeasure
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify IOOI board columns are visible
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Input' })).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Output' })).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Outcome' })).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Impact' })).toBeVisible();
	});

	test('displays existing effect in correct IOOI column', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testEffect
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify effect appears in the Output column (default iooiType)
		const outputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Output' });
		await expect(outputColumn.getByTitle(testEffect.payload.title)).toBeVisible();
	});

	['Output', 'Outcome', 'Impact'].forEach((iooiType) => {
		test(`can create effect in ${iooiType} column`, async ({
			dotsBoard,
			isMobile,
			testMeasure,
			testIndicator
		}) => {
			test.skip(isMobile, 'Feature cannot be enabled on mobile');

			// Open measure overlay and enable edit mode
			await dotsBoard.goto(`/${testMeasure.organization}`);
			await dotsBoard.card(testMeasure.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();

			// Navigate to IOOI workspace
			await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
			await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

			// Create new effect in column
			const column = dotsBoard.overlay.locator.locator('section', { hasText: iooiType });
			await column.getByRole('button', { name: 'Add item' }).first().click();

			// Select indicator from catalog
			await dotsBoard.overlay.locator
				.getByRole('article', { name: testIndicator.payload.title })
				.getByRole('button', { name: 'Select this template' })
				.click();

			// Verify the effect was created and overlay is showing it
			await expect(dotsBoard.overlay.title).toHaveText(testIndicator.payload.title);

			// Go back to IOOI board and verify effect is in column
			await dotsBoard.page.goto(`/${testMeasure.organization}#measure-iooi=${testMeasure.guid}`);
			await expect(column.getByTitle(testIndicator.payload.title)).toBeVisible();

			// Delete the created effect
			await column.getByTitle(testIndicator.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(testIndicator.payload.title);
			await dotsBoard.overlay.editModeToggle.check();
			await dotsBoard.overlay.delete();
		});
	});

	test('Input column shows dropdown menu for resource data types in measure IOOI board', async ({
		dotsBoard,
		isMobile,
		testMeasure
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay and enable edit mode
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify Input column has dropdown button (measures have two resource data types)
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		const addButton = inputColumn.getByRole('button', { name: 'Add item' }).first();
		await expect(addButton).toBeVisible();

		// Click to reveal dropdown options
		await addButton.click();

		// Verify both options are available
		await expect(
			dotsBoard.page.getByRole('menuitem', { name: 'Planned resource allocation' })
		).toBeVisible();
		await expect(
			dotsBoard.page.getByRole('menuitem', { name: 'Actual resource allocation' })
		).toBeVisible();

		// Close dropdown
		await dotsBoard.page.keyboard.press('Escape');
	});

	test('can create planned resource allocation in Input column for measure', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay and enable edit mode
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Create new resource data in Input column
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await inputColumn.getByRole('button', { name: 'Add item' }).first().click();

		// Select "Planned resource allocation" from dropdown
		await dotsBoard.page.getByRole('menuitem', { name: 'Planned resource allocation' }).click();

		// Select the resource from the grouped dropdown
		const dialog = dotsBoard.page.getByRole('dialog');
		await dialog.getByLabel('Resource').click();
		await dialog.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) }).check();

		// Fill in the title
		const resourceDataTitle = `Planned Resource ${Date.now()}`;
		await dialog.getByRole('textbox', { name: 'Title' }).fill(resourceDataTitle);

		// Save the item
		await dialog.getByRole('button', { name: 'Save' }).click();

		// Verify redirect to resource data overlay
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);

		// Navigate back to IOOI board
		await dotsBoard.page.goto(`/${testMeasure.organization}#measure-iooi=${testMeasure.guid}`);

		// Verify resource data appears in Input column
		await expect(inputColumn.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - delete the created resource data and auto-created section
		await inputColumn.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();

		// Go to main overlay view to delete the auto-created section
		await dotsBoard.page.goto(`/${testMeasure.organization}#view=${testMeasure.guid}`);
		await dotsBoard.overlay.editModeToggle.check();
		const plannedSection = dotsBoard.overlay.sections.filter({
			hasText: 'Planned resource allocation'
		});
		if ((await plannedSection.count()) > 0) {
			await dotsBoard.overlay.deleteSection(plannedSection.first());
		}
	});

	test('can create actual resource allocation in Input column for measure', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay and enable edit mode
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Create new resource data in Input column
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await inputColumn.getByRole('button', { name: 'Add item' }).first().click();

		// Select "Actual resource allocation" from dropdown
		await dotsBoard.page.getByRole('menuitem', { name: 'Actual resource allocation' }).click();

		// Select the resource from the grouped dropdown
		const dialog = dotsBoard.page.getByRole('dialog');
		await dialog.getByLabel('Resource').click();
		await dialog.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) }).check();

		// Fill in the title
		const resourceDataTitle = `Actual Resource ${Date.now()}`;
		await dialog.getByRole('textbox', { name: 'Title' }).fill(resourceDataTitle);

		// Save the item
		await dialog.getByRole('button', { name: 'Save' }).click();

		// Verify redirect to resource data overlay
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);

		// Navigate back to IOOI board
		await dotsBoard.page.goto(`/${testMeasure.organization}#measure-iooi=${testMeasure.guid}`);

		// Verify resource data appears in Input column
		await expect(inputColumn.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - delete the created resource data and auto-created section
		await inputColumn.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();

		// Go to main overlay view to delete the auto-created section
		await dotsBoard.page.goto(`/${testMeasure.organization}#view=${testMeasure.guid}`);
		await dotsBoard.overlay.editModeToggle.check();
		const actualSection = dotsBoard.overlay.sections.filter({
			hasText: 'Actual resource allocation'
		});
		if ((await actualSection.count()) > 0) {
			await dotsBoard.overlay.deleteSection(actualSection.first());
		}
	});

	test('automatically creates resource data collection section when adding resource data from Input column for measure', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay and enable edit mode
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Clean up any existing planned resource allocation section to ensure clean test state
		const existingPlannedSection = dotsBoard.overlay.sections.filter({
			hasText: 'Planned resource allocation'
		});
		if ((await existingPlannedSection.count()) > 0) {
			await dotsBoard.overlay.deleteSection(existingPlannedSection.first());
		}

		// Verify no planned resource allocation section exists now
		await expect(
			dotsBoard.overlay.sections.filter({ hasText: 'Planned resource allocation' })
		).toHaveCount(0);

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Create new planned resource allocation in Input column
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await inputColumn.getByRole('button', { name: 'Add item' }).first().click();

		// Select "Planned resource allocation" from dropdown
		await dotsBoard.page.getByRole('menuitem', { name: 'Planned resource allocation' }).click();

		// Select the resource from the grouped dropdown
		const dialog = dotsBoard.page.getByRole('dialog');
		await dialog.getByLabel('Resource').click();
		await dialog.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) }).check();

		// Fill in the title
		const resourceDataTitle = `Planned Resource ${Date.now()}`;
		await dialog.getByRole('textbox', { name: 'Title' }).fill(resourceDataTitle);

		// Save the item
		await dialog.getByRole('button', { name: 'Save' }).click();

		// Wait for redirect to resource data overlay
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);

		// Navigate back to main overlay view
		await dotsBoard.page.goto(`/${testMeasure.organization}#view=${testMeasure.guid}`);

		// Verify planned resource allocation section was automatically created
		const plannedSection = dotsBoard.overlay.sections.filter({
			hasText: 'Planned resource allocation'
		});
		await expect(plannedSection).toHaveCount(1);

		// Verify the resource data item is in the section
		await expect(plannedSection.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - delete the resource data and section
		await plannedSection.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();
		await dotsBoard.overlay.deleteSection(plannedSection);
	});

	test('Input column shows resource data', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Open measure overlay and enable edit mode
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Check if section already exists, otherwise create it
		let section = dotsBoard.overlay.sections.filter({
			hasText: 'Actual resource allocation'
		});
		if ((await section.count()) === 0) {
			section = await dotsBoard.overlay.addSection('Actual resource allocation');
		} else {
			section = section.first();
		}

		// Create a resource data item
		const resourceDataTitle = `Resource Data ${Date.now()}`;
		await section.getByRole('button', { name: 'Add item' }).first().click();

		// Select the resource from the grouped dropdown
		await dotsBoard.page.getByRole('dialog').getByLabel('Resource').click();
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) })
			.check();

		// Fill in the title
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('textbox', { name: 'Title' })
			.fill(resourceDataTitle);

		// Save the item
		await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		// Navigate back to the measure overlay
		await dotsBoard.overlay.backButton.click();

		// Navigate to IOOI workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

		// Verify resource data appears in the Input column
		const inputColumn = dotsBoard.overlay.locator.locator('section', { hasText: 'Input' });
		await expect(inputColumn.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - go back and delete the resource data
		await dotsBoard.page.goto(`/${testMeasure.organization}#view=${testMeasure.guid}`);
		await dotsBoard.overlay.editModeToggle.check();
		await section.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.delete();
		await dotsBoard.overlay.deleteSection(section);
	});
});
