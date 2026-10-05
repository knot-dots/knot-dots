import { expect, test, createProgramContainerFromTemplate, deleteContainer } from './fixtures';
import {
	type Container,
	containerOfType,
	type GoalPayload,
	payloadTypes,
	predicates
} from '$lib/models';

test.use({ suiteId: 'program-object-sections', storageState: 'tests/.auth/orgadmin.json' });

test('a template-bound goal section only lists goals created from it', async ({
	adminContext,
	programPage,
	testOrganization,
	testProgram,
	testProgramGoalTemplate
}) => {
	test.slow();
	const page = programPage.page;
	await programPage.goto(testProgram);
	await programPage.header.editModeToggle.check();

	// The menu offers one section per goal template of the program
	const sectionCreated = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container' && response.request().method() === 'POST'
	);
	const section = await programPage.addSection(testProgramGoalTemplate.payload.title);
	const sectionResponse = await sectionCreated;
	expect(sectionResponse.status()).toBe(201);
	const sectionContainer = await sectionResponse.json();
	expect(sectionContainer.payload).toMatchObject({
		listType: 'list',
		newItemTemplate: testProgramGoalTemplate.guid,
		objectType: payloadTypes.enum.goal,
		title: testProgramGoalTemplate.payload.title,
		type: payloadTypes.enum.object_collection
	});
	await expect(section.getByRole('textbox', { name: 'Title' })).toHaveValue(
		testProgramGoalTemplate.payload.title
	);

	// Layout sections are available on programs as well
	await section.hover();
	await section.getByRole('button', { name: 'Add section' }).click();
	await expect(
		page.getByRole('menuitem', { name: 'Supplementary text', exact: true })
	).toBeVisible();
	await page.keyboard.press('Escape');

	// The title can be renamed and the view switched to a wall
	const revisionSaved = () =>
		page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname === `/container/${sectionContainer.guid}/revision` &&
				response.request().method() === 'POST'
		);
	const titleSaved = revisionSaved();
	await section.getByRole('textbox', { name: 'Title' }).fill('Strategic goals');
	await titleSaved;
	await section.hover();
	const settingsDropdownButton = section.getByRole('button', { name: 'Settings' });
	await settingsDropdownButton.click();
	const settingsPanel = settingsDropdownButton.locator('//following-sibling::fieldset');
	await settingsPanel.getByRole('button', { name: 'View' }).click();
	const viewSaved = revisionSaved();
	await settingsPanel.getByRole('radio', { name: 'Wall' }).check();
	await viewSaved;
	await expect(section.locator('ul.catalog')).toBeVisible();
	await page.keyboard.press('Escape');

	// Adding an item skips the template picker and instantiates the bound template
	await section.getByRole('button', { name: 'Add item', exact: true }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Without template', { exact: true })).toHaveCount(0);
	await expect(dialog.getByRole('complementary', { name: 'Templates' })).toHaveCount(0);
	await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
	await expect(dialog.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
		testProgramGoalTemplate.payload.title
	);
	await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Section goal');
	const saved = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container/copy' &&
			response.request().method() === 'POST'
	);
	const sectionUpdated = revisionSaved();
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	const response = await saved;
	expect(response.status()).toBe(201);
	const instance = await response.json();
	let otherGoal: Container<GoalPayload> | undefined;
	try {
		expect(instance.payload.template).toBe(false);
		expect(instance.relation).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ object: testProgram.guid, predicate: 'is-part-of-program' })
			])
		);
		const updatedSection = await (await sectionUpdated).json();
		expect(updatedSection.payload.item).toEqual([instance.guid]);
		await expect(dialog).not.toBeVisible();

		// A goal added outside the section does not appear on the page
		const newGoal = containerOfType(
			payloadTypes.enum.goal,
			testOrganization
		) as Container<GoalPayload>;
		otherGoal = await createProgramContainerFromTemplate(
			adminContext,
			{
				...newGoal,
				payload: { ...newGoal.payload, title: 'Goal outside sections' },
				relation: [
					{
						object: testProgram.guid,
						position: 1,
						predicate: predicates.enum['is-part-of-program']
					}
				]
			},
			testProgram
		);

		await expect(async () => {
			await programPage.goto(testProgram);
			const savedSection = page.locator(`#section-${sectionContainer.guid}`);
			await expect(savedSection.getByRole('heading', { name: 'Strategic goals' })).toBeVisible();
			await expect(savedSection.locator('ul.catalog')).toBeVisible();
			await expect(savedSection.getByTitle('Section goal', { exact: true })).toBeVisible();
			await expect(page.getByRole('main').getByText('Goal outside sections')).toHaveCount(0);
		}).toPass({ timeout: 20000 });
	} finally {
		await deleteContainer(adminContext, instance);
		if (otherGoal) {
			await deleteContainer(adminContext, otherGoal);
		}
	}
});

test('the list view shows objects as chapters and the section filter hides other sections', async ({
	adminContext,
	programPage,
	testProgram,
	testProgramGoalTemplate
}) => {
	test.slow();
	const page = programPage.page;
	await programPage.goto(testProgram);
	await programPage.header.editModeToggle.check();

	const goalSection = await programPage.addSection(testProgramGoalTemplate.payload.title);
	await goalSection.hover();
	await goalSection.getByRole('button', { name: 'Add item', exact: true }).first().click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Listed goal');
	const saved = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container/copy' &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	const instance = await (await saved).json();
	try {
		await expect(dialog).not.toBeVisible();

		// The object is rendered like a chapter inside its section
		await expect(async () => {
			await programPage.goto(testProgram);
			await expect(
				programPage.chapters.filter({
					has: page.getByRole('heading', { level: 2, name: 'Listed goal' })
				})
			).toHaveCount(1);
		}).toPass({ timeout: 20000 });

		// A text section counts as "other" and is hidden by the goals filter
		await programPage.header.editModeToggle.check();
		const textSection = await programPage.addSection('Supplementary text');
		await expect(textSection).toBeVisible();
		await expect(programPage.sections).toHaveCount(2);

		await page.getByRole('button', { name: 'Filter' }).click();
		await page.getByRole('button', { name: 'Sections' }).click();
		const goalsOption = page.getByRole('checkbox', { name: 'Goals (1)' });
		const otherOption = page.getByRole('checkbox', { name: 'Other (1)' });
		await goalsOption.click({ force: true });
		await expect(goalsOption).toBeChecked();
		await expect(programPage.sections).toHaveCount(1);
		await expect(programPage.chapters).toHaveCount(1);

		await goalsOption.click({ force: true });
		await expect(goalsOption).not.toBeChecked();
		await otherOption.click({ force: true });
		await expect(otherOption).toBeChecked();
		await expect(programPage.sections).toHaveCount(1);
		await expect(programPage.chapters).toHaveCount(0);
	} finally {
		await deleteContainer(adminContext, instance);
	}
});
