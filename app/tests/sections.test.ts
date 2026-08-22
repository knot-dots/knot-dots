import {
	type Container,
	containerOfType,
	payloadTypes,
	predicates,
	type ProgressPayload
} from '$lib/models';
import { createContainer, deleteContainer, expect, test } from './fixtures';

test.use({ suiteId: 'sections' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

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

	// Remove the Progress section
	await dotsBoard.card(testGoal.payload.title).click();
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Remove section' }).click();
	const saveResponseForDelete = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await saveResponseForDelete;

	// Verify the goal card no longer shows a progress bar in the footer
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testGoal.payload.title).getByRole('progressbar')).not.toBeVisible();
});

test('progress can be computed from subordinate objects', async ({
	dotsBoard,
	testGoal,
	testTask
}) => {
	// All browser projects run this save-heavy test concurrently against a
	// single preview stack, so allow for the extra latency
	test.slow();

	await dotsBoard.goto(`/${testGoal.organization}`);
	await dotsBoard.card(testGoal.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	// Add a Progress section; manual measurement with a slider is the default.
	// Locate the section by its heading because sibling sections may render
	// with a delay and shift the index-based locator returned by addSection.
	await dotsBoard.overlay.addSection('Progress');
	const section = dotsBoard.overlay.sections.filter({
		has: dotsBoard.page.getByRole('heading', { name: 'Progress', exact: true })
	});
	await expect(section.getByRole('slider')).toBeVisible({ timeout: 15000 });

	// Switch measurement to subordinate objects; retry in case a pending
	// invalidation reverts the not-yet-saved payload change
	await expect(async () => {
		await section.hover();
		await section.getByRole('button', { name: 'Settings' }).click();
		await section.getByRole('button', { name: 'Progress measurement' }).click();
		await section.getByRole('radio', { name: 'Subordinate objects' }).check();
		await section.getByRole('button', { name: 'close' }).click();
		await expect(section.getByRole('slider')).not.toBeVisible({ timeout: 3000 });
	}).toPass({ timeout: 20000 });

	// The slider is replaced by a stacked bar with one segment per subordinate task
	const stackedBar = section.locator('.stacked-progress');
	await expect(stackedBar).toBeVisible({ timeout: 15000 });
	await expect(stackedBar.locator('.segment')).toHaveCount(1, { timeout: 15000 });
	await stackedBar.locator('.segment').hover();
	await expect(dotsBoard.page.getByRole('tooltip')).toContainText(testTask.payload.title);

	// Remove the Progress section so subsequent tests start from a pristine goal
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Remove section' }).click();
	const saveResponseForDelete = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await saveResponseForDelete;
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

test('sections can be re-ordered', async ({ dotsBoard, isMobile, testGoal }) => {
	test.skip(isMobile, 'Re-ordering via drag-and-drop does not work on mobile');

	await dotsBoard.goto(`/${testGoal.organization}`);
	await dotsBoard.card(testGoal.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	// Add two text sections with distinguishable headings
	const first = await dotsBoard.overlay.addSection('Supplementary text');
	const firstHeading = first.getByRole('heading').first();
	const saveFirstTitle = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await firstHeading.click();
	await firstHeading.fill('First section');
	await saveFirstTitle;

	const second = await dotsBoard.overlay.addSection('Supplementary text');
	const secondHeading = second.getByRole('heading').first();
	const saveSecondTitle = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await secondHeading.click();
	await secondHeading.fill('Second section');
	await saveSecondTitle;

	// Sanity: initial order
	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText(
		'First section'
	);
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText(
		'Second section'
	);

	// Re-order: drag the second section above the first
	const reorderResponse = dotsBoard.page.waitForResponse(
		(r) =>
			r.url().includes(`/container/${testGoal.guid}/relation`) && r.request().method() === 'POST'
	);
	await dotsBoard.overlay.moveSection(
		dotsBoard.overlay.sections.nth(1),
		dotsBoard.overlay.sections.nth(0)
	);
	await reorderResponse;

	// Verify new order
	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText(
		'Second section'
	);
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText(
		'First section'
	);

	// Reload to confirm the order was persisted
	await dotsBoard.page.reload();
	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText(
		'Second section'
	);
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText(
		'First section'
	);
});

test('editing and adding sections preserves the order after re-ordering', async ({
	dotsBoard,
	isMobile,
	testMeasure
}) => {
	test.skip(isMobile, 'Re-ordering via drag-and-drop does not work on mobile');

	await dotsBoard.goto(`/${testMeasure.organization}`);
	await dotsBoard.card(testMeasure.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	// Add two text sections
	const alpha = await dotsBoard.overlay.addSection('Supplementary text');
	const alphaHeading = alpha.getByRole('heading').first();
	let saveResponse = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await alphaHeading.click();
	await alphaHeading.fill('Alpha');
	await saveResponse;

	const beta = await dotsBoard.overlay.addSection('Supplementary text');
	const betaHeading = beta.getByRole('heading').first();
	saveResponse = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await betaHeading.click();
	await betaHeading.fill('Beta');
	await saveResponse;

	// Re-order: move Beta above Alpha -> [Beta, Alpha]
	const reorderResponse = dotsBoard.page.waitForResponse(
		(r) =>
			r.url().includes(`/container/${testMeasure.guid}/relation`) && r.request().method() === 'POST'
	);
	await dotsBoard.overlay.moveSection(
		dotsBoard.overlay.sections.nth(1),
		dotsBoard.overlay.sections.nth(0)
	);
	await reorderResponse;

	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText('Beta');
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText('Alpha');

	// Edit the (now) first section - the order must not revert
	const editedFirst = dotsBoard.overlay.sections.nth(0).getByRole('heading').first();
	saveResponse = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await editedFirst.click();
	await editedFirst.fill('Beta edited');
	await saveResponse;

	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText(
		'Beta edited'
	);
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText('Alpha');

	// Add another section - it should be appended at the end, not disturb existing order
	const gamma = await dotsBoard.overlay.addSection('Supplementary text');
	const gammaHeading = gamma.getByRole('heading').first();
	saveResponse = dotsBoard.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await gammaHeading.click();
	await gammaHeading.fill('Gamma');
	await saveResponse;

	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText(
		'Beta edited'
	);
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText('Alpha');
	await expect(dotsBoard.overlay.sections.nth(2).getByRole('heading').first()).toHaveText('Gamma');

	// Reload to confirm persistence
	await dotsBoard.page.reload();
	await expect(dotsBoard.overlay.sections.nth(0).getByRole('heading').first()).toHaveText(
		'Beta edited'
	);
	await expect(dotsBoard.overlay.sections.nth(1).getByRole('heading').first()).toHaveText('Alpha');
	await expect(dotsBoard.overlay.sections.nth(2).getByRole('heading').first()).toHaveText('Gamma');
});

test('computed progress appears on cards with a single request', async ({
	adminContext,
	dotsBoard,
	testGoal,
	testSubordinateGoal,
	testTask
}) => {
	// All browser projects run this test concurrently against a single preview
	// stack, so allow for the extra latency
	test.slow();

	// Requesting the fixture provides the subordinate task that yields the
	// single segment on the goal card
	void testTask;

	// Give both goals a computed progress section via the API
	const sections = [];
	for (const parent of [testGoal, testSubordinateGoal]) {
		const newSection = containerOfType(
			payloadTypes.enum.progress,
			parent.organization,
			null,
			parent.managed_by,
			'knot-dots'
		) as Container<ProgressPayload>;
		sections.push(
			await createContainer(adminContext, {
				...newSection,
				payload: {
					...newSection.payload,
					measurement: 'subordinateObjects',
					objectType: payloadTypes.enum.task
				},
				relation: [
					{ position: 0, predicate: predicates.enum['is-section-of'], object: parent.guid }
				]
			})
		);
	}

	let requestCount = 0;
	dotsBoard.page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname === '/container/v2' && url.searchParams.has('relatedTo')) {
			requestCount++;
		}
	});

	await dotsBoard.goto(`/${testGoal.organization}`);

	// The goal with a subordinate task shows a stacked bar with one segment
	const goalCard = dotsBoard.card(testGoal.payload.title);
	await expect(goalCard.locator('.stacked-progress')).toBeVisible({ timeout: 15000 });
	await expect(goalCard.locator('.segment')).toHaveCount(1, { timeout: 15000 });

	// The goal without subordinate tasks shows an empty stacked bar
	const subordinateGoalCard = dotsBoard.card(testSubordinateGoal.payload.title);
	await expect(subordinateGoalCard.locator('.stacked-progress')).toBeVisible({ timeout: 15000 });
	await expect(subordinateGoalCard.locator('.segment')).toHaveCount(0);

	// Both cards were served by a single batched request
	expect(requestCount).toBe(1);

	// Remove the sections so subsequent tests start from pristine goals
	for (const section of sections) {
		await deleteContainer(adminContext, section);
	}
});
