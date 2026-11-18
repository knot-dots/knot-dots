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
