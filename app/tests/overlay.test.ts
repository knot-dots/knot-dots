import { expect, test } from './fixtures';

test.use({ suiteId: 'overlay' });
test.use({ storageState: 'tests/.auth/admin.json' });

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
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText('Empty');
	const firstInvalidateResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
	await dotsBoard.overlay.locator.getByLabel('Goal type').click();
	const typeOfFirstGoal = 'Vision';
	await dotsBoard.overlay.locator.getByRole('radio', { name: typeOfFirstGoal }).check();
	await firstInvalidateResponse;

	// Change description of the second goal
	await dotsBoard.card(titleOfSecondGoal).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfSecondGoal);
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveCount(1);
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText('Empty');
	const secondInvalidateResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
	await dotsBoard.overlay.locator.getByLabel('Goal type').click();
	const typeOfSecondGoal = 'Strategic goal';
	await dotsBoard.overlay.locator.getByRole('radio', { name: typeOfSecondGoal }).check();
	await secondInvalidateResponse;

	// Verify goal and measure descriptions are persisted
	await dotsBoard.card(titleOfFirstGoal).click();
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText(typeOfFirstGoal);
	await dotsBoard.card(titleOfSecondGoal).click();
	await expect(dotsBoard.overlay.locator.getByLabel('Goal type')).toHaveText(typeOfSecondGoal);
});

test.describe('Full-screen', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

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
