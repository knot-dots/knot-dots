import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
	createProgramContainerFromTemplate,
	deleteContainer
} from './fixtures';
import {
	type Container,
	containerOfType,
	type GoalPayload,
	payloadTypes,
	predicates
} from '$lib/models';

const test = base.extend<{ outsideGoal: Container<GoalPayload>; templatingDisabled: void }>({
	// A goal added to the program outside any section does not show up on the page.
	outsideGoal: async ({ adminContext, testOrganization, testProgram }, use) => {
		const newGoal = containerOfType(
			payloadTypes.enum.goal,
			testOrganization
		) as Container<GoalPayload>;
		const outsideGoal = await createProgramContainerFromTemplate(
			adminContext,
			{
				...newGoal,
				payload: { ...newGoal.payload, title: 'Goal outside sections' },
				relation: [
					{
						object: testProgram.guid,
						position: 0,
						predicate: predicates.enum['is-part-of-program']
					}
				]
			},
			testProgram
		);
		await use(outsideGoal);
		await deleteContainer(adminContext, outsideGoal);
	},
	// Switches templates off for the signed-in user; the legacy create dialog is
	// used then. The flag is restored afterwards because the auth state is shared.
	templatingDisabled: async ({ page }, use) => {
		await setTemplating(page, false);
		await use();
		await setTemplating(page, true);
	}
});

async function setTemplating(page: Page, enabled: boolean) {
	await page.goto('/');
	await page.getByRole('navigation').getByRole('button', { name: 'User menu' }).click();
	await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
	const checkbox = page.getByRole('dialog').getByLabel('Templating');
	if (enabled) {
		await checkbox.check();
	} else {
		await checkbox.uncheck();
	}
	await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
}

test.use({ suiteId: 'program-object-sections', storageState: 'tests/.auth/orgadmin.json' });

test('a template-bound goal section only lists goals created from it', async ({
	adminContext,
	outsideGoal,
	programPage,
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
		payloadType: payloadTypes.enum.goal,
		title: testProgramGoalTemplate.payload.title,
		type: payloadTypes.enum.relation_collection
	});
	await expect(section.getByRole('textbox', { name: 'Title' })).toHaveValue(
		testProgramGoalTemplate.payload.title
	);

	// Layout sections are available on programs as well, the same template is not offered twice
	await section.hover();
	await section.getByRole('button', { name: 'Add section' }).click();
	await expect(
		page.getByRole('menuitem', { name: 'Supplementary text', exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('menuitem', { name: testProgramGoalTemplate.payload.title })
	).toHaveCount(0);
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

	// Adding an item opens the dialog with the bound template preset
	await section.getByRole('button', { name: 'Add item', exact: true }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
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
	expect(instance.payload.template).toBe(false);
	expect(instance.relation).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ object: testProgram.guid, predicate: 'is-part-of-program' })
		])
	);
	const updatedSection = await (await sectionUpdated).json();
	expect(updatedSection.payload.item).toEqual([instance.guid]);
	await expect(dialog).not.toBeVisible();

	await expect(async () => {
		await programPage.goto(testProgram);
		const savedSection = page.locator(`#section-${sectionContainer.guid}`);
		await expect(savedSection.getByRole('heading', { name: 'Strategic goals' })).toBeVisible();
		await expect(savedSection.locator('ul.catalog')).toBeVisible();
		await expect(savedSection.getByTitle('Section goal', { exact: true })).toBeVisible();
		await expect(page.getByRole('main').getByText(outsideGoal.payload.title)).toHaveCount(0);
	}).toPass({ timeout: 20000 });

	await deleteContainer(adminContext, instance);
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
	// The filter state lives in the URL, so wait for each navigation before the next click.
	await goalsOption.click({ force: true });
	await expect(page).toHaveURL(/section=goals/);
	await expect(goalsOption).toBeChecked();
	await expect(programPage.sections).toHaveCount(1);
	await expect(programPage.chapters).toHaveCount(1);

	await goalsOption.click({ force: true });
	await expect(page).not.toHaveURL(/section=/);
	await expect(goalsOption).not.toBeChecked();
	await otherOption.click({ force: true });
	await expect(page).toHaveURL(/section=other/);
	await expect(otherOption).toBeChecked();
	await expect(programPage.sections).toHaveCount(1);
	await expect(programPage.chapters).toHaveCount(0);

	await deleteContainer(adminContext, instance);
});

test('without templates a plain goal section adds goals through the legacy dialog', async ({
	adminContext,
	programPage,
	templatingDisabled,
	testProgram
}) => {
	void templatingDisabled;
	const page = programPage.page;
	await programPage.goto(testProgram);
	await programPage.header.editModeToggle.check();

	// Without templates the menu offers the plain type
	const sectionCreated = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container' && response.request().method() === 'POST'
	);
	const section = await programPage.addSection('Goals');
	const sectionContainer = await (await sectionCreated).json();
	expect(sectionContainer.payload).toMatchObject({
		payloadType: payloadTypes.enum.goal,
		type: payloadTypes.enum.relation_collection
	});
	expect(sectionContainer.payload).not.toHaveProperty('newItemTemplate');

	// The legacy dialog creates the goal and the section records it
	await section.hover();
	await section.getByRole('button', { name: 'Add item', exact: true }).first().click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('textbox', { name: 'Title' }).fill('Plain goal');
	const saved = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container' && response.request().method() === 'POST'
	);
	const sectionUpdated = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === `/container/${sectionContainer.guid}/revision` &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	const goal = await (await saved).json();
	expect(goal.relation).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ object: testProgram.guid, predicate: 'is-part-of-program' })
		])
	);
	const updatedSection = await (await sectionUpdated).json();
	expect(updatedSection.payload.item).toEqual([goal.guid]);

	// Programs list the goal like a chapter inside its section
	await expect(async () => {
		await programPage.goto(testProgram);
		const savedSection = page.locator(`#section-${sectionContainer.guid}`);
		await expect(savedSection.getByRole('heading', { level: 2, name: 'Plain goal' })).toBeVisible();
		await expect(programPage.chapters.filter({ hasText: 'Plain goal' })).toHaveCount(1);
	}).toPass({ timeout: 20000 });

	await deleteContainer(adminContext, goal);
});
