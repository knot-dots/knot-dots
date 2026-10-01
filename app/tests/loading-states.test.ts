import { expect, test } from './fixtures';

test.use({ suiteId: 'loading-states' });

test.describe('Loading states', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('results are dimmed while a filter is applied', async ({ page, testGoal }) => {
		await page.goto(`/${testGoal.organization}/goals/catalog`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTitle(testGoal.payload.title)).toBeVisible();

		const results = page.getByRole('main');
		await expect(results).toHaveAttribute('aria-busy', 'false');

		// Hold back the data of the filtered page to observe the loading state
		let releaseData!: () => void;
		const dataReleased = new Promise<void>((resolve) => (releaseData = resolve));
		await page.route('**/__data.json*', async (route) => {
			await dataReleased;
			await route.continue();
		});

		await page.getByRole('button', { name: 'Status' }).click();
		// Filter options are labelled with the number of matching objects
		const statusOption = page.getByRole('checkbox', { name: /\(\d+\)$/ }).first();
		await statusOption.check();

		await expect(results).toHaveAttribute('aria-busy', 'true');
		// The filter stays usable while results are loading
		await expect(statusOption).toBeEnabled();
		await expect(page.getByRole('progressbar', { name: 'Loading…' })).toBeVisible();

		releaseData();

		await expect(page).toHaveURL(/\?.+/);
		await expect(results).toHaveAttribute('aria-busy', 'false');
		await expect(page.getByRole('progressbar')).toHaveCount(0);
	});

	test('a progress bar is shown while another page is loading', async ({ page, testGoal }) => {
		await page.goto(`/${testGoal.organization}/goals/catalog`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTitle(testGoal.payload.title)).toBeVisible();

		let releaseData!: () => void;
		const dataReleased = new Promise<void>((resolve) => (releaseData = resolve));
		await page.route('**/goals/level/__data.json*', async (route) => {
			await dataReleased;
			await route.continue();
		});

		await page.getByRole('button', { name: 'Catalog' }).click();
		await page.getByRole('menuitem', { name: 'Level board' }).click();

		await expect(page.getByRole('progressbar', { name: 'Loading…' })).toBeVisible();

		releaseData();

		await expect(page).toHaveURL(/\/goals\/level/);
		await expect(page.getByRole('progressbar')).toHaveCount(0);
	});

	test('an overlay opens with a skeleton while its data is loading', async ({
		goalsBoard,
		page,
		testGoal
	}) => {
		await page.goto(`/${testGoal.organization}/goals/catalog`);
		await page.waitForLoadState('networkidle');

		let releaseData!: () => void;
		const dataReleased = new Promise<void>((resolve) => (releaseData = resolve));
		await page.route(`**/${testGoal.guid}/__data.json*`, async (route) => {
			await dataReleased;
			await route.continue();
		});

		await page.getByTitle(testGoal.payload.title).click();

		await expect(goalsBoard.overlay.locator).toBeVisible();
		await expect(goalsBoard.overlay.locator.getByRole('progressbar')).toBeVisible();
		await expect(goalsBoard.overlay.locator.locator('[aria-busy="true"]').first()).toBeAttached();

		releaseData();

		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);
		await expect(goalsBoard.overlay.locator.getByRole('progressbar')).toHaveCount(0);
	});

	test('an overlay shows a skeleton while switching to another object', async ({
		goalsBoard,
		page,
		testGoal,
		testSubordinateGoal
	}) => {
		await page.goto(`/${testGoal.organization}/goals/catalog`);
		await page.waitForLoadState('networkidle');
		await page.getByTitle(testGoal.payload.title).click();
		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);

		let releaseData!: () => void;
		const dataReleased = new Promise<void>((resolve) => (releaseData = resolve));
		await page.route(`**/${testSubordinateGoal.guid}/__data.json*`, async (route) => {
			await dataReleased;
			await route.continue();
		});

		await page.evaluate((guid) => (location.hash = `view=${guid}`), testSubordinateGoal.guid);

		// The previous object is not shown any longer while the next one is loading
		await expect(goalsBoard.overlay.title).toHaveCount(0);
		await expect(goalsBoard.overlay.locator.locator('[aria-busy="true"]').first()).toBeAttached();

		releaseData();

		await expect(goalsBoard.overlay.title).toHaveText(testSubordinateGoal.payload.title);
	});

	test('a failure to load an overlay is reported', async ({ page, testGoal }) => {
		await page.goto(`/${testGoal.organization}/goals/catalog`);
		await page.waitForLoadState('networkidle');

		await page.route(`**/${testGoal.guid}/__data.json*`, (route) =>
			route.fulfill({
				contentType: 'application/json',
				json: { type: 'error', error: { message: 'Internal Error' }, status: 500 },
				status: 500
			})
		);

		await page.getByTitle(testGoal.payload.title).click();

		await expect(
			page.getByRole('status').filter({ hasText: 'Could not load content' })
		).toBeVisible();
		await expect(page.getByRole('progressbar')).toHaveCount(0);
	});
});
