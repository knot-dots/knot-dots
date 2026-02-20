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

		// Clean up - delete the created resource data
		await inputColumn.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();
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

		// Clean up - delete the created resource data
		await inputColumn.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();
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

		// Clean up - delete the created resource data
		await inputColumn.getByTitle(resourceDataTitle).click();
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.delete();
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

		// Add resource data section
		const section = await dotsBoard.overlay.addSection('Actual resource allocation');

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
