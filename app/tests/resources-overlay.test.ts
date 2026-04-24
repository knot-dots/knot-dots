import { expect, test } from './fixtures';

test.use({ suiteId: 'resources-overlay' });

test.describe('Resources overlay', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test.skip(({ isMobile }) => isMobile, 'Workspace menu is not visible on mobile');

	test('resources workspace shows program-scoped resources', async ({
		dotsBoard,
		testProgram,
		testResourceV2,
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();

		// Verify the resources overlay shows the test resource
		await expect(dotsBoard.overlay.locator).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByTitle(testResourceV2.payload.title)).toBeVisible();
	});

	test('resources overlay is not editable', async ({
		dotsBoard,
		testProgram,
		testResourceV2, // eslint-disable-line @typescript-eslint/no-unused-vars
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();

		// Verify no create button is visible (editable={false})
		await expect(
			dotsBoard.overlay.locator.getByRole('button', { name: /Create/i })
		).not.toBeVisible();
	});

	test('resource card in overlay opens detail view with program filter', async ({
		dotsBoard,
		testProgram,
		testResourceV2,
		testResourceDataBudget, // eslint-disable-line @typescript-eslint/no-unused-vars
		testMeasure
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();

		// Click the resource card in the overlay
		await dotsBoard.overlay.locator.getByTitle(testResourceV2.payload.title).click();

		// Verify the resource detail view shows in a nested overlay/view
		const resourceDetailOverlay = dotsBoard.overlay.locator
			.filter({ hasText: testResourceV2.payload.title })
			.first();
		await expect(resourceDetailOverlay).toBeVisible();

		// Verify the resource table shows only program-scoped data
		const table = resourceDetailOverlay.getByRole('table');
		await expect(table).toBeVisible();

		// The budget row should link to the test measure (part of the program)
		const budgetSection = table.locator('tbody').filter({ hasText: 'Budgets' });
		await expect(
			budgetSection.getByRole('link', { name: testMeasure.payload.title })
		).toBeVisible();
	});

	test('resource table filters out data not belonging to program', async ({
		dotsBoard,
		testProgram,
		testResourceV2,
		testResourceDataBudget,
		testGoalBudget,
		testMeasure,
		testGoal
	}) => {
		// Verify both resource data entries use the same resource
		expect(testResourceDataBudget.payload.resource).toBe(testResourceV2.guid);
		expect(testGoalBudget.payload.resource).toBe(testResourceV2.guid);

		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();

		// Click the resource card in the overlay
		await dotsBoard.overlay.locator.getByTitle(testResourceV2.payload.title).click();

		// Verify the resource detail view shows
		const resourceDetailOverlay = dotsBoard.overlay.locator
			.filter({ hasText: testResourceV2.payload.title })
			.first();
		await expect(resourceDetailOverlay).toBeVisible();

		const table = resourceDetailOverlay.getByRole('table');
		await expect(table).toBeVisible();

		// Verify the measure (part of program) IS visible
		const budgetSection = table.locator('tbody').filter({ hasText: 'Budgets' });
		await expect(
			budgetSection.getByRole('link', { name: testMeasure.payload.title })
		).toBeVisible();

		// Verify the goal (NOT part of program) is NOT visible
		await expect(
			budgetSection.getByRole('link', { name: testGoal.payload.title })
		).not.toBeVisible();
	});
});

test.describe('Resources fullscreen', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test.skip(({ isMobile }) => isMobile, 'Workspace menu is not visible on mobile');

	test('switch between resources overlay and fullscreen', async ({
		dotsBoard,
		testProgram,
		testResourceV2,
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();
		await expect(dotsBoard.overlay.title).not.toBeVisible();

		// Click full-screen button
		await dotsBoard.overlay.fullScreenButton.click();

		// Verify overlay disappears
		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();

		// Verify we're on the fullscreen route
		expect(dotsBoard.page.url()).toContain('/resources/catalog');
		expect(dotsBoard.page.url()).toContain(testProgram.guid);

		// Verify the resource card is still visible on the fullscreen page
		await expect(dotsBoard.page.getByTitle(testResourceV2.payload.title)).toBeVisible();

		// Go back to overlay
		await dotsBoard.page.getByRole('link', { name: 'Back to overlay' }).first().click();
		await expect(dotsBoard.overlay.locator).toBeVisible();
	});

	test('go back to overlay after navigating to another workspace', async ({
		dotsBoard,
		testProgram,
		testResourceV2,
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();
		await expect(dotsBoard.overlay.title).not.toBeVisible();

		// Go to fullscreen
		await dotsBoard.overlay.fullScreenButton.click();
		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();

		// Navigate to another workspace
		await dotsBoard.page.getByRole('button', { name: 'Resources' }).click();
		await dotsBoard.page.getByRole('menuitem', { name: 'Measures' }).click();

		// Verify we're in the Measures workspace
		await expect(dotsBoard.page.getByRole('button', { name: 'Measures' })).toBeVisible();

		// Go back to overlay
		await dotsBoard.page.getByRole('link', { name: 'Back to overlay' }).first().click();
		await expect(dotsBoard.overlay.locator).toBeVisible();
		// Verify we're back in the Resources workspace showing the resource
		await expect(dotsBoard.overlay.locator.getByTitle(testResourceV2.payload.title)).toBeVisible();
	});

	test('back-to-overlay button disappears after navigating somewhere else', async ({
		dotsBoard,
		testProgram,
		testResourceV2, // eslint-disable-line @typescript-eslint/no-unused-vars
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		// Switch to Resources workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Resources' }).click();

		// Go to fullscreen
		await dotsBoard.overlay.fullScreenButton.click();
		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();

		// Navigate away from the program context
		await dotsBoard.page.goto(`/${testProgram.organization}`);
		await expect(dotsBoard.page.getByRole('link', { name: 'Back to overlay' })).not.toBeVisible();
	});

	test('fullscreen resources catalog shows program-filtered resources', async ({
		page,
		testProgram,
		testResourceV2,
		testResourceDataBudget // eslint-disable-line @typescript-eslint/no-unused-vars
	}) => {
		// Navigate directly to the fullscreen resources catalog route
		await page.goto(`/${testProgram.organization}/${testProgram.guid}/resources/catalog`);

		// Verify the resource card for testResourceV2 is visible
		await expect(page.getByTitle(testResourceV2.payload.title)).toBeVisible();

		// Verify the catalog is not editable (no create button)
		await expect(page.getByRole('button', { name: /Create/i })).not.toBeVisible();
	});
});
