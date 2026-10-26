import { expect, test } from './fixtures';

test.use({ suiteId: 'overlay' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('objects can be edited sequentially', async ({ dotsBoard, testOrganization }) => {
	await dotsBoard.goto(`/${testOrganization.guid}`);

	// Create two goals
	const titleOfFirstGoal = 'My first goal';
	const titleOfSecondGoal = 'My second goal';

	await dotsBoard.column('Goals').addItemButton.click();
	await dotsBoard.page
		.getByRole('dialog')
		.getByRole('textbox', { name: 'Title' })
		.fill(titleOfFirstGoal);
	await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await dotsBoard.overlay.closeButton.click();

	await dotsBoard.column('Goals').addItemButton.click();
	await dotsBoard.page
		.getByRole('dialog')
		.getByRole('textbox', { name: 'Title' })
		.fill(titleOfSecondGoal);
	await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await dotsBoard.overlay.closeButton.click();

	// Change type of the first goal
	await dotsBoard.card(titleOfFirstGoal).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfFirstGoal);
	await dotsBoard.overlay.editModeToggle.check();
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText('Goal');
	const firstSaveResponse = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.overlay.locator.getByLabel('Goal type').click();
	const typeOfFirstGoal = 'Vision';
	await dotsBoard.overlay.locator.getByRole('radio', { name: typeOfFirstGoal }).click();
	await firstSaveResponse;

	// Change description of the second goal
	await dotsBoard.card(titleOfSecondGoal).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfSecondGoal);
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveCount(1);
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText('Goal');
	const secondSaveResponse = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.overlay.locator.getByLabel('Goal type').click();
	const typeOfSecondGoal = 'Strategic goal';
	await dotsBoard.overlay.locator.getByRole('radio', { name: typeOfSecondGoal }).click();
	await secondSaveResponse;

	// Verify goal and measure descriptions are persisted
	await dotsBoard.card(titleOfFirstGoal).click();
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText(typeOfFirstGoal);
	await dotsBoard.card(titleOfSecondGoal).click();
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText(typeOfSecondGoal);
});

test.describe('Full-screen', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('switch between full-screen and overlay', async ({ dotsBoard, testProgram }) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);

		await dotsBoard.overlay.fullScreenButton.click();
		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();
		await expect(dotsBoard.page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
			testProgram.payload.title
		);

		await dotsBoard.page.getByRole('link', { name: 'Back to overlay' }).click();
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
	});

	test('go back to overlay after navigating to another workspace', async ({
		dotsBoard,
		testProgram
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);

		await dotsBoard.overlay.fullScreenButton.click();
		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();
		await expect(dotsBoard.page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
			testProgram.payload.title
		);

		await dotsBoard.page.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.page.getByRole('menuitem', { name: 'Measures' }).click();

		await expect(dotsBoard.page.getByRole('button', { name: 'Measures' })).toBeVisible();
		await dotsBoard.page.getByRole('link', { name: 'Back to overlay' }).click();
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
	});

	test('back-to-overlay button disappears after navigating somewhere else', async ({
		dotsBoard,
		testProgram
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);

		await dotsBoard.overlay.fullScreenButton.click();
		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();
		await expect(dotsBoard.page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
			testProgram.payload.title
		);

		await dotsBoard.page.goto(`/${testProgram.organization}`);
		await expect(dotsBoard.page.getByRole('link', { name: 'Back to overlay' })).not.toBeVisible();
	});
});

test.describe('Load failures', () => {
	// SvelteKit responds with a JSON error when a load function fails
	const failure = {
		contentType: 'application/json',
		json: { type: 'error', error: { message: 'Internal Error' }, status: 500 },
		status: 500
	};

	test('a failed overlay is reported and can be opened again', async ({ goalsBoard, testGoal }) => {
		await goalsBoard.goto(`/${testGoal.organization}`);
		await goalsBoard.page.route(`**/${testGoal.guid}/__data.json*`, (route) =>
			route.fulfill(failure)
		);

		await goalsBoard.card(testGoal.payload.title).click();

		await expect(
			goalsBoard.page.getByRole('status').filter({ hasText: 'Could not load content' })
		).toBeVisible();
		await expect(goalsBoard.overlay.locator).not.toBeVisible();
		await expect(goalsBoard.page).not.toHaveURL(/view=/);

		await goalsBoard.page.unroute(`**/${testGoal.guid}/__data.json*`);
		await goalsBoard.card(testGoal.payload.title).click();

		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);
	});

	test('the open overlay stays when switching to another one fails', async ({
		goalsBoard,
		testGoal,
		testSubordinateGoal
	}) => {
		await goalsBoard.goto(`/${testGoal.organization}`);
		await goalsBoard.card(testGoal.payload.title).click();
		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);

		await goalsBoard.page.route(`**/${testSubordinateGoal.guid}/__data.json*`, (route) =>
			route.fulfill(failure)
		);
		await goalsBoard.page.evaluate(
			(guid) => (location.hash = `view=${guid}`),
			testSubordinateGoal.guid
		);

		await expect(
			goalsBoard.page.getByRole('status').filter({ hasText: 'Could not load content' })
		).toBeVisible();
		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);
		await expect(goalsBoard.page).toHaveURL(new RegExp(`view=${testGoal.guid}`));
		await expect(goalsBoard.overlay.backButton).not.toBeVisible();
	});

	test('the open overlay stays when going back fails', async ({ goalsBoard, testGoal }) => {
		await goalsBoard.goto(`/${testGoal.organization}`);
		// The relations overlay loads without the preload cache of SvelteKit
		await goalsBoard.page.evaluate((guid) => (location.hash = `relations=${guid}`), testGoal.guid);
		await goalsBoard.overlay.locator
			.getByRole('link', { name: testGoal.payload.title, exact: true })
			.click();
		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);
		await expect(goalsBoard.page).toHaveURL(new RegExp(`view=${testGoal.guid}`));
		await expect(goalsBoard.overlay.backButton).toBeVisible();

		await goalsBoard.page.route(`**/container/${testGoal.guid}/revision`, (route) =>
			route.fulfill(failure)
		);
		await goalsBoard.overlay.backButton.click();

		await expect(
			goalsBoard.page.getByRole('status').filter({ hasText: 'Could not load content' })
		).toBeVisible();
		await expect(goalsBoard.page).toHaveURL(new RegExp(`view=${testGoal.guid}`));
		await expect(goalsBoard.overlay.backButton).toBeVisible();
	});

	test('a failed overlay is reported on the page of another object', async ({
		page,
		testGoal,
		testSubordinateGoal
	}) => {
		await page.goto(`/${testGoal.organization}/${testGoal.guid}`);
		await page.waitForLoadState('networkidle');
		await page.route(`**/${testSubordinateGoal.guid}/__data.json*`, (route) =>
			route.fulfill(failure)
		);

		await page.evaluate((guid) => (location.hash = `view=${guid}`), testSubordinateGoal.guid);

		await expect(
			page.getByRole('status').filter({ hasText: 'Could not load content' })
		).toBeVisible();
		await expect(page.locator('.overlay')).not.toBeVisible();
	});
});
