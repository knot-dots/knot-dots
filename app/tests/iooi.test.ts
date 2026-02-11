import { expect, test } from './fixtures';

test.describe('Goal IOOI Board', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('can navigate to goal IOOI board from overlay', async ({
		dotsBoard,
		isMobile,
		testGoal
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable IOOI feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('IOOI').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay
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

		// Enable IOOI feature flag
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('IOOI').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open goal overlay
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

			// Enable IOOI feature flag
			await dotsBoard.goto(`/${testGoal.organization}`);
			await dotsBoard.sidebar.openProfileSettings();
			await dotsBoard.page.getByLabel('IOOI').check();
			const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
			await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
			await response;

			// Open goal overlay and enable edit mode
			await dotsBoard.card(testGoal.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();

			// Navigate to IOOI workspace
			await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
			await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

			// Create new objective in Output column
			const column = dotsBoard.overlay.locator.locator('section', { hasText: iooiType });
			await column.getByRole('button', { name: 'Add item' }).first().click();

			// Select indicator from catalog
			await dotsBoard.overlay.locator.getByRole('button', { name: 'Select this template' }).click();

			// Verify the objective was created and overlay is showing it
			await expect(dotsBoard.overlay.title).toHaveText(testIndicator.payload.title);

			// Go back to IOOI board and verify objective is in Output column
			await dotsBoard.page.goto(`/${testGoal.organization}#goal-iooi=${testGoal.guid}`);
			await expect(column.getByTitle(testIndicator.payload.title)).toBeVisible();

			// Delete the created objective
			await column.getByTitle(testIndicator.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();
			await dotsBoard.overlay.delete();
		});
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

		// Enable IOOI feature flag
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('IOOI').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open measure overlay
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

		// Enable IOOI feature flag
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('IOOI').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open measure overlay
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

			// Enable IOOI feature flag
			await dotsBoard.goto(`/${testMeasure.organization}`);
			await dotsBoard.sidebar.openProfileSettings();
			await dotsBoard.page.getByLabel('IOOI').check();
			const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
			await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
			await response;

			// Open measure overlay and enable edit mode
			await dotsBoard.card(testMeasure.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();

			// Navigate to IOOI workspace
			await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
			await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();

			// Create new effect in column
			const column = dotsBoard.overlay.locator.locator('section', { hasText: iooiType });
			await column.getByRole('button', { name: 'Add item' }).first().click();

			// Select indicator from catalog
			await dotsBoard.overlay.locator.getByRole('button', { name: 'Select this template' }).click();

			// Verify the effect was created and overlay is showing it
			await expect(dotsBoard.overlay.title).toHaveText(testIndicator.payload.title);

			// Go back to IOOI board and verify effect is in column
			await dotsBoard.page.goto(`/${testMeasure.organization}#measure-iooi=${testMeasure.guid}`);
			await expect(column.getByTitle(testIndicator.payload.title)).toBeVisible();

			// Delete the created effect
			await column.getByTitle(testIndicator.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();
			await dotsBoard.overlay.delete();
		});
	});

	test('Input column shows resource data', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable IOOI and ResourcesV2 feature flags
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('IOOI').check();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open measure overlay and enable edit mode
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
		await dotsBoard.overlay.delete();
		await dotsBoard.overlay.deleteSection(section);
	});
});
