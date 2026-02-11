import { expect, test } from './fixtures';

test.use({ storageState: 'tests/.auth/admin.json' });

test('goal columns are based on hierarchy', async ({ dotsBoard, testOrganization }) => {
	test.skip(
		true,
		'This test cannot succeed if another test creates a goal in the same test organization concurrently.'
	);

	await dotsBoard.goto(`${testOrganization.guid}`);
	await expect(dotsBoard.column('Implementation').locator).toBeVisible();

	const titleOfVision = 'My Vision';
	await dotsBoard.column('Goals').addItemButton.click();
	const dialog = dotsBoard.page.getByRole('dialog');
	await dialog.getByPlaceholder('Title').fill(titleOfVision);
	await dialog.getByLabel('Goal type').click();
	await dialog.getByRole('radio', { name: 'Vision', exact: true }).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfVision);
	await dotsBoard.overlay.closeButton.click();

	const titleOfStrategicGoal = 'My strategic goal';
	await dotsBoard.column('Visions').addItemButton.click();
	await expect(dialog.getByLabel('Hierarchy level')).toHaveValue('1');
	await dialog.getByPlaceholder('Title').fill(titleOfStrategicGoal);
	await dialog.getByLabel('Hierarchy level').fill('2');
	await dialog.getByLabel('Goal type').click();
	await dialog.getByRole('radio', { name: 'Strategic goal', exact: true }).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfStrategicGoal);
	await dotsBoard.overlay.closeButton.click();

	const titleOfOperationalGoal = 'My operational goal';
	await dotsBoard.column('Strategic goals').addItemButton.click();
	await expect(dialog.getByLabel('Hierarchy level')).toHaveValue('2');
	await dialog.getByPlaceholder('Title').fill(titleOfOperationalGoal);
	await dialog.getByLabel('Hierarchy level').fill('3');
	await dialog.getByLabel('Goal type').click();
	await dialog.getByRole('radio', { name: 'Operational goal', exact: true }).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfOperationalGoal);
	await dotsBoard.overlay.closeButton.click();

	await expect(dotsBoard.columns.nth(1).getByRole('heading', { level: 2 })).toHaveText('Visions');
	await expect(dotsBoard.columns.nth(2).getByRole('heading', { level: 2 })).toHaveText(
		'Strategic goals'
	);
	await expect(dotsBoard.columns.nth(3).getByRole('heading', { level: 2 })).toHaveText(
		'Operational goals'
	);
});

test('measure columns are based on hierarchy', async ({ dotsBoard, testOrganization }) => {
	test.skip(
		true,
		'This test cannot succeed if another test creates a measure in the same test organization concurrently.'
	);

	await dotsBoard.goto(`${testOrganization.guid}`);
	await expect(dotsBoard.column('Implementation').locator).toBeVisible();

	const titleOfProject = 'My project';
	await dotsBoard.column('Implementation').addItemButton.click();
	await dotsBoard
		.column('Implementation')
		.locator.getByRole('menuitem', { name: 'Measure', exact: true })
		.click();
	const dialog = dotsBoard.page.getByRole('dialog');
	await dialog.getByPlaceholder('Title').fill(titleOfProject);
	await dialog.getByLabel('Measure type').click();
	await dialog.getByRole('radio', { name: 'Project', exact: true }).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfProject);
	await dotsBoard.overlay.closeButton.click();

	const titleOfModule = 'My module';
	await dotsBoard.column('Projects').addItemButton.click();
	await dotsBoard
		.column('Projects')
		.locator.getByRole('menuitem', { name: 'Measure', exact: true })
		.click();
	await expect(dialog.getByLabel('Hierarchy level')).toHaveValue('1');
	await dialog.getByPlaceholder('Title').fill(titleOfModule);
	await dialog.getByLabel('Hierarchy level').fill('2');
	await dialog.getByLabel('Measure type').click();
	await dialog.getByRole('radio', { name: 'Module', exact: true }).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfModule);
	await dotsBoard.overlay.closeButton.click();

	const titleOfActivity = 'My activity';
	await dotsBoard.column('Modules').addItemButton.click();
	await expect(dialog.getByLabel('Hierarchy level')).toHaveValue('2');
	await dialog.getByPlaceholder('Title').fill(titleOfActivity);
	await dialog.getByLabel('Hierarchy level').fill('3');
	await dialog.getByLabel('Measure type').click();
	await dialog.getByRole('radio', { name: 'Activity', exact: true }).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleOfActivity);
	await dotsBoard.overlay.closeButton.click();

	await expect(dotsBoard.columns.nth(-1).getByRole('heading', { level: 2 })).toHaveText(
		'Activities'
	);
	await expect(dotsBoard.columns.nth(-2).getByRole('heading', { level: 2 })).toHaveText('Modules');
	await expect(dotsBoard.columns.nth(-3).getByRole('heading', { level: 2 })).toHaveText('Projects');
});
