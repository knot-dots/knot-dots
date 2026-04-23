import { expect, test } from './fixtures';

test.use({ suiteId: 'dots-board' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('Selected objects can be displayed in a section', async ({
	landingPage,
	testGoal,
	testIndicatorTemplate,
	testMeasure,
	testOrganization,
	testOrganizationalUnit,
	testProgram,
	testReport
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	// Add "Embed objects" section
	const section = await landingPage.addSection('Embed objects');
	await section.getByPlaceholder('Enter title').fill('My selection');
	await section.hover();

	// Open dialog to select objects
	await section.getByRole('button', { name: 'Add items' }).click();

	// Assert catalog of available objects is displayed
	const dialog = landingPage.page.getByRole('dialog');
	const expectedObjects = [
		testGoal,
		testIndicatorTemplate,
		testMeasure,
		testOrganizationalUnit,
		testProgram,
		testReport
	];
	await expect(dialog.getByText('Choose objects')).toBeVisible();
	await expect(dialog.getByText('Select', { exact: true })).toBeChecked();
	for (const object of expectedObjects) {
		await expect(
			dialog.getByRole('article').filter({
				has: landingPage.page.getByRole('heading', {
					name: 'title' in object.payload ? object.payload.title : object.payload.name
				})
			})
		).toBeVisible();
	}

	// Select individual objects by clicking on their checkboxes
	await dialog.getByRole('button', { name: 'Type of element' }).click();
	await dialog.getByRole('checkbox', { name: 'Goal (1)', exact: true }).check();
	await dialog.getByRole('checkbox', { name: 'Measure (1)', exact: true }).check();
	await dialog.getByRole('checkbox', { name: 'Organizational unit (1)', exact: true }).check();
	await expect(dialog.getByRole('article')).toHaveCount(3);
	await dialog.getByRole('checkbox', { name: testGoal.payload.title }).check();
	await dialog.getByRole('checkbox', { name: testMeasure.payload.title }).check();
	await dialog.getByRole('checkbox', { name: testOrganizationalUnit.payload.name }).check();

	// Assert selected objects are displayed in the preview
	const confirmButton = dialog.getByRole('button', { name: 'Accept selection (3)' });
	const preview = confirmButton.locator('//following-sibling::ul');

	await expect(confirmButton).toBeVisible();
	await expect(
		preview.getByRole('listitem').filter({ hasText: testGoal.payload.title })
	).toBeVisible();
	await expect(
		preview.getByRole('listitem').filter({ hasText: testMeasure.payload.title })
	).toBeVisible();

	// Assert dialog closes and selected objects are displayed in the section
	await confirmButton.click();
	await expect(dialog).not.toBeVisible();
	await expect(section.getByRole('link', { name: testGoal.payload.title })).toBeVisible();
	await expect(section.getByRole('link', { name: testMeasure.payload.title })).toBeVisible();
	await expect(
		section.getByRole('link', { name: testOrganizationalUnit.payload.name })
	).toBeVisible();
	await expect(section.getByRole('button', { name: 'Add item' })).not.toBeVisible();

	// Assert show-all link is not displayed
	await section.hover();
	await expect(section.getByRole('link', { name: 'Show all' })).not.toBeVisible();
});

test('Rule-based collections can be displayed in a section', async ({
	landingPage,
	testGoal,
	testIndicatorTemplate,
	testMeasure,
	testOrganization,
	testProgram,
	testReport
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	// Add "Embed objects" section
	const section = await landingPage.addSection('Embed objects');
	await section.getByPlaceholder('Enter title').fill('My rule-based collection');
	await section.hover();

	// Open dialog to select objects
	await section.getByRole('button', { name: 'Add items' }).click();

	// Assert catalog of available objects is displayed
	const dialog = landingPage.page.getByRole('dialog');
	await expect(dialog.getByText('Choose objects')).toBeVisible();
	const expectedObjects = [testGoal, testIndicatorTemplate, testMeasure, testProgram, testReport];
	for (const object of expectedObjects) {
		await expect(
			dialog
				.getByRole('article')
				.filter({ has: landingPage.page.getByRole('heading', { name: object.payload.title }) })
		).toBeVisible();
	}

	// Create rule by applying filters
	await dialog.getByRole('button', { name: 'Type of element' }).click();
	await dialog.getByRole('checkbox', { name: 'Program (1)', exact: true }).check();
	await dialog.getByRole('checkbox', { name: 'Report (1)', exact: true }).check();
	await expect(dialog.getByRole('article')).toHaveCount(2);
	await dialog.getByText('Apply rule').check();

	// Assert selected filters are displayed in the preview
	const confirmButton = dialog.getByRole('button', { name: 'Apply rule' });
	const preview = confirmButton.locator('//following-sibling::ul');
	await expect(confirmButton).toBeVisible();
	await expect(preview.getByText('Program')).toBeVisible();
	await expect(preview.getByText('Report')).toBeVisible();

	// Assert dialog closes and objects matching the rule are displayed in the section
	await confirmButton.click();
	await expect(dialog).not.toBeVisible();
	await expect(section.getByRole('link', { name: testProgram.payload.title })).toBeVisible();
	await expect(section.getByRole('link', { name: testReport.payload.title })).toBeVisible();
	await expect(section.getByRole('button', { name: 'Add item' })).not.toBeVisible();

	// Assert show-all link is displayed
	await section.hover();
	await expect(section.getByRole('link', { name: 'Show all' })).toBeVisible();
});

test('New item can be added to custom collection', async ({
	landingPage,
	reportTemplate,
	testOrganization
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	// Add "Embed objects" section
	const section = await landingPage.addSection('Embed objects');
	await section.getByPlaceholder('Enter title').fill('My selection');
	await section.hover();

	// Open dialog to select templates for new items
	await section.hover();
	const settingsDropdownButton = section.getByRole('button', { name: 'section settings' });
	await settingsDropdownButton.click();
	const settingsPanel = settingsDropdownButton.locator('//following-sibling::fieldset');
	await settingsPanel.getByRole('button', { name: 'Select templates' }).click();

	// Assert catalog of available template is displayed
	const dialog = landingPage.page.getByRole('dialog');
	await expect(dialog.getByText('Select templates')).toBeVisible();
	const expectedObjects = [reportTemplate];
	for (const object of expectedObjects) {
		await expect(
			dialog
				.getByRole('article')
				.filter({ has: landingPage.page.getByRole('heading', { name: object.payload.title }) })
		).toBeVisible();
	}

	// Select templates by clicking on their checkboxes
	await dialog.getByRole('checkbox', { name: reportTemplate.payload.title }).check();

	// Assert selected templates are displayed in the preview
	const confirmButton = dialog.getByRole('button', { name: 'Accept selection (1)' });
	const preview = confirmButton.locator('//following-sibling::ul');

	await expect(confirmButton).toBeVisible();
	await expect(
		preview.getByRole('listitem').filter({ hasText: reportTemplate.payload.title })
	).toBeVisible();

	// Assert dialog closes and selected objects are displayed in the section
	await confirmButton.click();
	await expect(dialog).not.toBeVisible();
	await expect(section.getByRole('button', { name: 'Add item' })).toBeVisible();

	// Assert clicking the add item button creates a new report
	await section.getByRole('button', { name: 'Add item' }).click();
	await section.getByRole('menuitem', { name: reportTemplate.payload.title }).click();
	await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue(
		reportTemplate.payload.title
	);
	await dialog.getByRole('textbox', { name: 'Title' }).fill('My report');
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(landingPage.overlay.title).toHaveText('My report');

	// Assert new report appears in the section
	await landingPage.overlay.closeButton.click();
	await expect(section.getByRole('link', { name: 'My report' })).toBeVisible();
});

test('Custom collection can be configured', async ({ landingPage, testOrganization }) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Embed objects');
	await section.hover();
	const settingsDropdownButton = section.getByRole('button', { name: 'section settings' });
	await settingsDropdownButton.click();
	const settingsPanel = settingsDropdownButton.locator('//following-sibling::fieldset');
	await settingsPanel.getByRole('button', { name: 'interactions' }).click();

	await expect(settingsPanel.getByRole('checkbox', { name: 'search' })).toBeVisible();
	await expect(settingsPanel.getByRole('checkbox', { name: 'sort' })).toBeVisible();

	await settingsPanel.getByRole('checkbox', { name: 'sort' }).check();
	await settingsPanel.getByRole('button', { name: 'back' }).click();

	await expect(settingsPanel.getByRole('button', { name: 'interactions' })).toContainText(/sort/i);
});
