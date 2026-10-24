import { deleteContainer, expect, test } from './fixtures';

test.use({ suiteId: 'relation-sections', storageState: 'tests/.auth/orgadmin.json' });

test('a goals section of a measure adds goals as parts of the measure', async ({
	adminContext,
	dotsBoard,
	measureGoalTemplate,
	testMeasure
}) => {
	await dotsBoard.goto(`/${testMeasure.organization}`);
	await dotsBoard.card(testMeasure.payload.title).click();
	await expect(dotsBoard.overlay.title).toHaveText(testMeasure.payload.title);
	await dotsBoard.overlay.editModeToggle.check();

	// Adding the section stores the base type and the structural predicate
	const sectionSaved = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container' && response.request().method() === 'POST'
	);
	const section = await dotsBoard.overlay.addSection('Goals');
	const savedSection = await (await sectionSaved).json();
	expect(savedSection.payload).toEqual(
		expect.objectContaining({
			item: [],
			listType: 'carousel',
			payloadType: 'goal',
			predicate: 'is-part-of',
			title: 'Goals',
			type: 'relation_collection'
		})
	);

	// A measure gets one goals section
	await section.hover();
	await section.getByRole('button', { name: 'Add section' }).click();
	await expect(
		dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Goals', exact: true })
	).toHaveCount(0);
	await dotsBoard.page.keyboard.press('Escape');

	// A goal created from the section is a part of the measure
	await section.getByRole('button', { name: 'Add item', exact: true }).first().click();
	const dialog = dotsBoard.page.getByRole('dialog');
	await dialog.getByRole('article').filter({ hasText: measureGoalTemplate.payload.title }).click();
	await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Goal from section');
	const goalSaved = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container/copy' &&
			response.request().method() === 'POST'
	);
	const sectionUpdated = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === `/container/${savedSection.guid}/revision` &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	const goal = await (await goalSaved).json();
	try {
		expect(goal.relation).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ object: testMeasure.guid, predicate: 'is-part-of' }),
				expect.objectContaining({ object: testMeasure.guid, predicate: 'is-part-of-measure' })
			])
		);
		expect(goal.managed_by).toEqual(testMeasure.managed_by);

		// The section lists the new goal, also after a reload
		const updatedSection = await (await sectionUpdated).json();
		expect(updatedSection.payload.item).toEqual([goal.guid]);
		await expect(async () => {
			await dotsBoard.page.reload();
			await expect(
				dotsBoard.overlay.locator
					.locator(`#section-${savedSection.guid}`)
					.getByTitle('Goal from section', { exact: true })
			).toBeVisible();
		}).toPass({ timeout: 20000 });
	} finally {
		await deleteContainer(adminContext, goal);
	}
});

test('a tasks section of a goal outside a measure adds plain tasks', async ({
	adminContext,
	dotsBoard,
	testGoal
}) => {
	await dotsBoard.goto(`/${testGoal.organization}`);
	await dotsBoard.card(testGoal.payload.title).click();
	await expect(dotsBoard.overlay.title).toHaveText(testGoal.payload.title);
	await dotsBoard.overlay.editModeToggle.check();

	const sectionSaved = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container' && response.request().method() === 'POST'
	);
	const section = await dotsBoard.overlay.addSection('Tasks');
	const savedSection = await (await sectionSaved).json();
	expect(savedSection.payload).toEqual(
		expect.objectContaining({ payloadType: 'task', predicate: 'is-part-of' })
	);

	// Without a measure above the goal, no template scope applies
	await section.getByRole('button', { name: 'Add item', exact: true }).first().click();
	const dialog = dotsBoard.page.getByRole('dialog');
	const withoutTemplate = dialog.getByText('Without template', { exact: true });
	if (await withoutTemplate.isVisible()) {
		await withoutTemplate.click();
	}
	await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Task from section');
	const taskSaved = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container' && response.request().method() === 'POST'
	);
	const sectionUpdated = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === `/container/${savedSection.guid}/revision` &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	const task = await (await taskSaved).json();
	try {
		expect(task.relation).toEqual([
			expect.objectContaining({ object: testGoal.guid, predicate: 'is-part-of' })
		]);
		const updatedSection = await (await sectionUpdated).json();
		expect(updatedSection.payload.item).toEqual([task.guid]);
		await expect(async () => {
			await dotsBoard.page.reload();
			await expect(
				dotsBoard.overlay.locator
					.locator(`#section-${savedSection.guid}`)
					.getByTitle('Task from section', { exact: true })
			).toBeVisible();
		}).toPass({ timeout: 20000 });
	} finally {
		await deleteContainer(adminContext, task);
	}
});
