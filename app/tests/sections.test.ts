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
	const invalidateRequestForUpdate = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
	await section.getByRole('textbox', { name: 'Summary' }).fill(summary);
	await invalidateRequestForUpdate;

	// Verify the card shows the summary
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testMeasure.payload.title)).toContainText(summary);

	// Remove the Summary section
	await dotsBoard.card(testMeasure.payload.title).click();
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Delete' }).click();
	const invalidateRequestForDelete = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await invalidateRequestForDelete;

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
	const invalidateRequestForUpdate = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
	await dotsBoard.page.mouse.up();
	await invalidateRequestForUpdate;

	// Verify the card shows a progress bar in the footer
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testGoal.payload.title).getByRole('progressbar')).toBeVisible();

	// Remove the Summary section
	await dotsBoard.card(testGoal.payload.title).click();
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Delete' }).click();
	const invalidateRequestForDelete = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await invalidateRequestForDelete;

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

test('custom collection interactions only show configured options', async ({
	landingPage,
	testOrganization
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	const numberOfSections = await landingPage.sections.count();
	await landingPage.page.getByRole('button', { name: 'Add section' }).click();
	await landingPage.page
		.getByRole('menuitem', {
			name: /objekte einbinden|embed objects|tiles|custom collection|kacheln/i
		})
		.click();

	const section = landingPage.sections.nth(numberOfSections);
	await expect(section).toBeVisible();

	const hasCustomSettings =
		(await section.locator('.custom-settings .dropdown-button').count()) > 0;
	test.skip(
		!hasCustomSettings,
		'Custom collection section is not available in this test configuration.'
	);

	await section.hover();
	await section.locator('.custom-settings .dropdown-button').click();

	const settingsPanel = section.locator('.custom-settings-panel');
	const interactionsItem = settingsPanel.getByRole('button', {
		name: /interactions|interaktionen/i
	});
	const initialSummary = (await interactionsItem.innerText()).toLowerCase();

	expect(initialSummary).not.toContain('filter');

	await interactionsItem.click();

	await expect(settingsPanel.getByRole('button', { name: /search|suche/i })).toBeVisible();
	await expect(settingsPanel.getByRole('button', { name: /sort|sortieren/i })).toBeVisible();
	await expect(settingsPanel.getByRole('button', { name: /filter|filtern/i })).toHaveCount(0);

	await settingsPanel.getByRole('button', { name: /sort|sortieren/i }).click();
	await settingsPanel.getByRole('button', { name: /back|zurück/i }).click();

	await expect(interactionsItem).toContainText(/sort|sortieren/i);
	await expect(interactionsItem).not.toContainText(/filter|filtern/i);
});
