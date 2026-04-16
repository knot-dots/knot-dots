import { expect, test } from './fixtures';

test.use({ suiteId: 'indicators' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('create custom indicator with actual data', async ({ indicatorCatalog, testOrganization }) => {
	await indicatorCatalog.goto(`/${testOrganization.guid}`);
	await indicatorCatalog.header.editModeToggle.check();

	// Create a custom indicator
	const titleOfCustomIndicator = 'My Indicator';
	await indicatorCatalog.addCustomIndicatorButton.click();
	await indicatorCatalog.page
		.getByRole('dialog')
		.getByRole('textbox', { name: 'Title' })
		.fill(titleOfCustomIndicator);
	await indicatorCatalog.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await expect(indicatorCatalog.overlay.title).toHaveText(titleOfCustomIndicator);

	// Enable entering actual data
	await indicatorCatalog.overlay.locator.getByText('Table').click();
	const table = indicatorCatalog.overlay.locator.getByRole('table');
	await table.getByRole('button', { name: 'Add custom actual data' }).click();
	await expect(table.getByRole('row', { name: 'Custom actual data' })).toBeVisible();

	// Add a column and fill actual data
	await table.getByRole('button', { name: 'Add column left' }).click();
	await expect(table.getByRole('columnheader', { name: /\d+/ })).toHaveCount(2);
	const customActualDataInputs = table
		.getByRole('row', { name: 'Custom actual data' })
		.locator('input[data-year]');
	const firstValue = '101.5';
	const firstSaveResponse = indicatorCatalog.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await expect(customActualDataInputs).toHaveCount(2);
	await customActualDataInputs.first().fill(firstValue);
	await firstSaveResponse;

	// Add another column and fill actual data
	await table.getByRole('button', { name: 'Add column right' }).click();
	await expect(table.getByRole('columnheader', { name: /\d+/ })).toHaveCount(3);
	const secondValue = '246.7';
	const secondSaveResponse = indicatorCatalog.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await expect(customActualDataInputs).toHaveCount(3);
	await customActualDataInputs.last().fill(secondValue);
	await secondSaveResponse;

	// Verify actual data is persisted
	await indicatorCatalog.page.reload();
	await indicatorCatalog.overlay.locator.getByText('Table').click();
	await expect(table.getByRole('cell', { name: firstValue })).toBeVisible();
	await expect(table.getByRole('cell', { name: secondValue })).toBeVisible();
});

test('add section to indicator', async ({ indicatorCatalog, testOrganization }) => {
	await indicatorCatalog.goto(`/${testOrganization.guid}`);
	await indicatorCatalog.header.editModeToggle.check();

	// Create a custom indicator
	const titleOfCustomIndicator = 'My Indicator';
	await indicatorCatalog.addCustomIndicatorButton.click();
	await indicatorCatalog.page
		.getByRole('dialog')
		.getByRole('textbox', { name: 'Title' })
		.fill(titleOfCustomIndicator);
	await indicatorCatalog.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await expect(indicatorCatalog.overlay.title).toHaveText(titleOfCustomIndicator);

	// Add a text section
	const section = await indicatorCatalog.overlay.addSection('Text');
	const saveResponse = indicatorCatalog.page.waitForResponse(
		(r) => r.url().includes('/revision') && r.request().method() === 'POST'
	);
	await section.getByRole('heading').fill('Lorem ipsum');
	await section
		.getByRole('textbox')
		.fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
	await saveResponse;

	// Verify section is persisted
	await indicatorCatalog.page.reload();
	await expect(section.getByRole('heading')).toHaveText('Lorem ipsum');
	await expect(section).toContainText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
});

test('activate selected indicators', async ({ indicatorCatalog, testIndicatorTemplate }) => {
	await indicatorCatalog.goto(`/${testIndicatorTemplate.organization}`);
	await indicatorCatalog.header.editModeToggle.check();

	// Open the indicator catalog and select the indicator template
	await indicatorCatalog.activateSelectedIndicatorsButton.click();
	await expect(indicatorCatalog.page.getByRole('dialog')).toContainText(
		'Select indicators to activate'
	);
	await indicatorCatalog.page
		.getByRole('dialog')
		.getByRole('checkbox', { name: testIndicatorTemplate.payload.title })
		.check();
	await indicatorCatalog.page.getByRole('dialog').getByRole('button', { name: 'Activate' }).click();

	// Verify the indicator is activated and has custom actual data
	await indicatorCatalog.card(testIndicatorTemplate.payload.title).click();
	await expect(indicatorCatalog.overlay.title).toHaveText(testIndicatorTemplate.payload.title);
	await indicatorCatalog.overlay.locator.getByText('Table').click();
	await expect(
		indicatorCatalog.overlay.locator.getByRole('row', { name: 'Custom actual data' })
	).toBeVisible();
});
