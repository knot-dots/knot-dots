import { expect, test } from './fixtures';

test.use({ suiteId: 'sections' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('adding and removing a summary sections updates the card', async ({
	dotsBoard,
	testMeasure
}) => {
	await dotsBoard.goto(`/${testMeasure.organization}`);
	await dotsBoard.card(testMeasure.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	const summary = 'Lorem ipsum dolor sit amet consectetur adipiscing elit';

	// Add a Summary section
	const section = await dotsBoard.overlay.addSection('Summary');
	const saveResponseForUpdate = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await section.getByRole('textbox', { name: 'Summary' }).fill(summary);
	await saveResponseForUpdate;

	// Verify the card shows the summary
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.overlay.locator).not.toBeVisible();
	await expect(dotsBoard.card(testMeasure.payload.title)).toContainText(summary);

	// Remove the Summary section
	await dotsBoard.card(testMeasure.payload.title).click();
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Delete' }).click();
	const saveResponseForDelete = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await saveResponseForDelete;

	// Verify the card no longer shows the summary
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testMeasure.payload.title)).not.toContainText(summary);
});

test('adding and removing a progress section updates the card', async ({ dotsBoard, testGoal }) => {
	await dotsBoard.goto(`/${testGoal.organization}`);
	await dotsBoard.card(testGoal.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	// Add a Progress section and set the progress slider to 80%
	const section = await dotsBoard.overlay.addSection('Progress');
	const progressSlider = section.getByRole('slider');
	await expect(progressSlider).toBeVisible();
	const sliderOffsetWidth = await progressSlider.evaluate((el) => {
		return el.getBoundingClientRect().width * 0.8;
	});
	await progressSlider.hover({ position: { x: sliderOffsetWidth, y: 10 } });
	await dotsBoard.page.mouse.down();
	const saveResponseForUpdate = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.page.mouse.up();
	await saveResponseForUpdate;

	// Verify the card shows a progress bar in the footer
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.overlay.locator).not.toBeVisible();
	await expect(dotsBoard.card(testGoal.payload.title).getByRole('progressbar')).toBeVisible();

	// Remove the Summary section
	await dotsBoard.card(testGoal.payload.title).click();
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Delete' }).click();
	const saveResponseForDelete = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await saveResponseForDelete;

	// Verify the goal card no longer shows a progress bar in the footer
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testGoal.payload.title).getByRole('progressbar')).not.toBeVisible();
});

test('inline help is edit-only', async ({ dotsBoard, testReport }) => {
	await dotsBoard.goto(`/${testReport.organization}`);
	await dotsBoard.card(testReport.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	const inlineHelp = await dotsBoard.overlay.addSection('Inline help');
	await expect(inlineHelp.getByText('Inline help')).toBeVisible();

	await dotsBoard.overlay.editModeToggle.uncheck();
	await expect(dotsBoard.overlay.locator.getByText('Inline help')).toHaveCount(0);
});
