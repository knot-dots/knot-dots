import { expect, test } from './fixtures';

test.use({ suiteId: 'dots-board' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('Selected objects can be displayed in a section', async ({
	isMobile,
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
	const saveResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await section.getByPlaceholder('Enter title').fill('My selection');
	await saveResponse;
	await section.hover();

	// Open dialog to select objects
	await section.getByRole('button', { name: 'Add items', exact: true }).click();

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

	// Select individual objects by clicking on their cards
	await dialog.getByRole('button', { name: 'Type of element' }).click();
	await dialog.getByRole('checkbox', { name: 'Goal (1)', exact: true }).check();
	await dialog.getByRole('checkbox', { name: 'Measure (1)', exact: true }).check();
	await dialog.getByRole('checkbox', { name: 'Organizational unit (1)', exact: true }).check();
	await expect(dialog.getByRole('article')).toHaveCount(3);
	await dialog.getByRole('article').filter({ hasText: testGoal.payload.title }).click();
	await dialog.getByRole('article').filter({ hasText: testMeasure.payload.title }).click();
	await dialog
		.getByRole('article')
		.filter({ hasText: testOrganizationalUnit.payload.name })
		.click();

	// Assert selected objects are displayed in the preview
	const confirmButton = dialog.getByRole('button', { name: 'Apply (3)' });
	const preview = dialog.locator('.selection-panel .selection-list');

	await expect(confirmButton).toBeVisible();

	if (isMobile) {
		await expect(
			preview.getByRole('listitem').filter({ hasText: testGoal.payload.title })
		).toBeHidden();
		await expect(
			preview.getByRole('listitem').filter({ hasText: testMeasure.payload.title })
		).toBeHidden();
	} else {
		await expect(
			preview.getByRole('listitem').filter({ hasText: testGoal.payload.title })
		).toBeVisible();
		await expect(
			preview.getByRole('listitem').filter({ hasText: testMeasure.payload.title })
		).toBeVisible();
	}

	// Assert dialog closes and selected objects are displayed in the section
	await confirmButton.click();
	await expect(dialog).not.toBeVisible();
	await expect(section.getByRole('link', { name: testGoal.payload.title })).toBeVisible();
	await expect(section.getByRole('link', { name: testMeasure.payload.title })).toBeVisible();
	await expect(
		section.getByRole('link', { name: testOrganizationalUnit.payload.name })
	).toBeVisible();
	await expect(section.getByRole('button', { name: 'Add item', exact: true })).not.toBeVisible();

	// Assert show-all link is not displayed
	await section.hover();
	await expect(section.getByRole('link', { name: 'Show all' })).not.toBeVisible();
});

test('Rule-based collections can be displayed in a section', async ({
	isMobile,
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
	const saveResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await section.getByPlaceholder('Enter title').fill('My rule-based collection');
	await saveResponse;
	await section.hover();

	// Open dialog to select objects
	await section.getByRole('button', { name: 'Add items', exact: true }).click();

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
	const preview = dialog.locator('.selection-panel .selection-list');
	await expect(confirmButton).toBeVisible();

	if (isMobile) {
		await expect(preview.getByText('Program')).toBeHidden();
		await expect(preview.getByText('Report')).toBeHidden();
	} else {
		await expect(preview.getByText('Program')).toBeVisible();
		await expect(preview.getByText('Report')).toBeVisible();
	}

	// Assert dialog closes and objects matching the rule are displayed in the section
	await confirmButton.click();
	await expect(dialog).not.toBeVisible();
	await expect(section.getByRole('link', { name: testProgram.payload.title })).toBeVisible();
	await expect(section.getByRole('link', { name: testReport.payload.title })).toBeVisible();
	await expect(section.getByRole('button', { name: 'Add item', exact: true })).not.toBeVisible();

	// Assert show-all link is displayed
	await section.hover();
	await expect(section.getByRole('link', { name: 'Show all' })).toBeVisible();
});

test('Organization scope can be configured for rule-based collections', async ({
	isMobile,
	landingPage,
	testGoal,
	testOrganization,
	testOrganizationalUnit,
	testOrganizationalUnitGoal
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	// Add "Embed objects" section
	const section = await landingPage.addSection('Embed objects');
	const saveResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await section.getByPlaceholder('Enter title').fill('My scoped collection');
	await saveResponse;
	await section.hover();

	// Open dialog to select objects
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const dialog = landingPage.page.getByRole('dialog');
	await expect(dialog.getByText('Choose objects')).toBeVisible();

	// The default scope is the whole current organization
	const goalCard = dialog.getByRole('article').filter({ hasText: testGoal.payload.title });
	const organizationalUnitGoalCard = dialog
		.getByRole('article')
		.filter({ hasText: testOrganizationalUnitGoal.payload.title });
	await expect(goalCard).toBeVisible();
	await expect(organizationalUnitGoalCard).toBeVisible();

	// Open the organization filter dropdown
	await dialog.getByRole('button', { name: 'Organization' }).click();
	await expect(dialog.getByRole('radio', { name: 'Current organization' })).toBeChecked();
	const organizationCheckbox = dialog.getByRole('checkbox', {
		name: new RegExp(`^${testOrganization.payload.name} \\(`)
	});
	await expect(organizationCheckbox).toBeDisabled();

	// Exclude organizational units
	await dialog.getByRole('checkbox', { name: 'Without organizational units' }).check();
	await expect(organizationalUnitGoalCard).not.toBeVisible();
	await expect(goalCard).toBeVisible();

	// Switching to explicit selection pre-checks the current organization
	await dialog.getByRole('radio', { name: 'Explicit selection' }).check();
	await expect(organizationCheckbox).toBeEnabled();
	await expect(organizationCheckbox).toBeChecked();
	await expect(goalCard).toBeVisible();
	await expect(organizationalUnitGoalCard).toBeVisible();

	// Select only the organizational unit
	await organizationCheckbox.uncheck();
	const organizationOption = dialog
		.locator('.option')
		.filter({ hasText: testOrganization.payload.name });
	await organizationOption.locator('.suboption-button').click();
	const organizationalUnitCheckbox = dialog.getByRole('checkbox', {
		name: new RegExp(`^${testOrganizationalUnit.payload.name} \\(`)
	});
	await organizationalUnitCheckbox.check();
	await expect(organizationalUnitGoalCard).toBeVisible();
	await expect(goalCard).not.toBeVisible();

	// Reset clears all checkboxes
	await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(organizationCheckbox).not.toBeChecked();
	await expect(organizationalUnitCheckbox).not.toBeChecked();

	// Select the organizational unit again and apply as rule
	await organizationalUnitCheckbox.check();
	await dialog.getByText('Apply rule').check();
	const preview = dialog.locator('.selection-panel .selection-list');
	if (!isMobile) {
		await expect(
			preview.getByRole('listitem').filter({ hasText: testOrganizationalUnit.payload.name })
		).toBeVisible();
	}
	await dialog.getByRole('button', { name: 'Apply rule' }).click();
	await expect(dialog).not.toBeVisible();

	// Assert only content of the organizational unit is displayed in the section
	await expect(
		section.getByRole('link', { name: testOrganizationalUnitGoal.payload.title })
	).toBeVisible();
	await expect(section.getByRole('link', { name: testGoal.payload.title })).not.toBeVisible();

	// Assert show-all link is displayed
	await section.hover();
	await expect(section.getByRole('link', { name: 'Show all' })).toBeVisible();
});

test('New item can be added to custom collection', async ({
	isMobile,
	landingPage,
	reportTemplate,
	testOrganization
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	// Add "Embed objects" section
	const section = await landingPage.addSection('Embed objects');
	const saveResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await section.getByPlaceholder('Enter title').fill('My selection');
	await saveResponse;
	await section.hover();

	// Open dialog to select templates for new items
	await section.hover();
	const settingsDropdownButton = section.getByRole('button', { name: 'Settings' });
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

	// Select templates by clicking on their cards
	await dialog.getByRole('article').filter({ hasText: reportTemplate.payload.title }).click();

	// Assert selected templates are displayed in the preview
	const confirmButton = dialog.getByRole('button', { name: 'Apply (1)' });
	const preview = dialog.locator('.selection-panel .selection-list');

	await expect(confirmButton).toBeVisible();

	if (isMobile) {
		await expect(
			preview.getByRole('listitem').filter({ hasText: reportTemplate.payload.title })
		).toBeHidden();
	} else {
		await expect(
			preview.getByRole('listitem').filter({ hasText: reportTemplate.payload.title })
		).toBeVisible();
	}

	// Assert dialog closes and selected objects are displayed in the section
	await confirmButton.click();
	await expect(dialog).not.toBeVisible();
	const addItemButton = section.getByRole('button', { name: 'Add item', exact: true });
	await expect(addItemButton).toBeVisible();
	await expect(addItemButton).toHaveAttribute('aria-haspopup', 'true');

	// Assert clicking the add item button creates a new report
	await addItemButton.click();
	const newItem = section.getByRole('menuitem', { name: reportTemplate.payload.title });
	await expect(newItem).toBeVisible();
	await newItem.click();
	await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue(
		reportTemplate.payload.title
	);
	await dialog.getByRole('textbox', { name: 'Title' }).fill('My report');
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(landingPage.overlay.title).toHaveText('My report');

	// Assert new report appears in the section
	await landingPage.overlay.closeButton.click();
	await landingPage.goto(`/${testOrganization.guid}`);
	await expect(section.getByRole('link', { name: 'My report' })).toBeVisible();
});

test('Template picker can be closed with the close button', async ({
	landingPage,
	testOrganization
}) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Embed objects');
	const saveResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await section.getByPlaceholder('Enter title').fill('My selection');
	await saveResponse;
	await section.hover();

	const settingsDropdownButton = section.getByRole('button', { name: 'Settings' });
	await settingsDropdownButton.click();
	const settingsPanel = settingsDropdownButton.locator('//following-sibling::fieldset');
	await settingsPanel.getByRole('button', { name: 'Select templates' }).click();

	const dialog = landingPage.page.getByRole('dialog');
	await expect(dialog.getByText('Select templates')).toBeVisible();

	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).not.toBeVisible();
});

test('Custom collection can be configured', async ({ landingPage, testOrganization }) => {
	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Embed objects');
	await section.hover();
	const settingsDropdownButton = section.getByRole('button', { name: 'Settings' });
	await settingsDropdownButton.click();
	const settingsPanel = settingsDropdownButton.locator('//following-sibling::fieldset');
	await settingsPanel.getByRole('button', { name: 'interactions' }).click();

	await expect(settingsPanel.getByRole('checkbox', { name: 'search' })).toBeVisible();
	await expect(settingsPanel.getByRole('checkbox', { name: 'sort' })).toBeVisible();

	await settingsPanel.getByRole('checkbox', { name: 'sort' }).check();
	await settingsPanel.getByRole('button', { name: 'back' }).click();

	await expect(settingsPanel.getByRole('button', { name: 'interactions' })).toContainText(/sort/i);
});
