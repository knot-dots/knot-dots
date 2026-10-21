import { type Container, containerOfType, type IndicatorPayload, payloadTypes } from '$lib/models';
import { createContainer, deleteContainer, expect, test as base } from './fixtures';

const test = base.extend<{ otherIndicator: Container<IndicatorPayload> }>({
	otherIndicator: async ({ adminContext, testOrganization }, use, testInfo) => {
		const newIndicator = containerOfType(
			payloadTypes.enum.indicator,
			testOrganization
		) as Container<IndicatorPayload>;
		const otherIndicator = await createContainer(adminContext, {
			...newIndicator,
			payload: {
				...newIndicator.payload,
				title: `Other Indicator ${testInfo.workerIndex}`,
				unit: 'unit.km'
			}
		});

		await use(otherIndicator);

		await deleteContainer(adminContext, otherIndicator);
	}
});

test.use({ suiteId: 'indicator-dashboard' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('Selected indicators show the data of the organizational unit the section belongs to', async ({
	landingPage,
	organizationalUnitWithActualData,
	otherIndicator,
	testIndicator
}) => {
	await landingPage.goto(`/${organizationalUnitWithActualData.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Indicator dashboard');
	await expect(section.getByText('Select the indicators to show here.')).toBeVisible();

	// Select two indicators
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const dialog = landingPage.page.getByRole('dialog');
	for (const indicator of [testIndicator, otherIndicator]) {
		await dialog.getByRole('searchbox').fill(indicator.payload.title);
		await dialog.getByRole('article').filter({ hasText: indicator.payload.title }).click();
	}
	await dialog.getByRole('button', { name: 'Apply (2)' }).click();
	await expect(dialog).not.toBeVisible();

	// Both indicators are displayed in the order of selection, each with the data of the unit
	const items = section.getByRole('article');
	await expect(items).toHaveCount(2);
	await expect(items.nth(0)).toContainText(testIndicator.payload.title);
	await expect(items.nth(0).getByText('Source: Wegweiser Kommune')).toBeVisible();
	await expect(items.nth(1)).toContainText(otherIndicator.payload.title);
	await expect(items.nth(1).getByText('No data available')).toBeVisible();

	// Remove one indicator
	await section.hover();
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	await dialog.getByRole('searchbox').fill(otherIndicator.payload.title);
	await dialog.getByRole('article').filter({ hasText: otherIndicator.payload.title }).click();
	await dialog.getByRole('button', { name: 'Apply (1)' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(items).toHaveCount(1);

	// The selection is saved
	await landingPage.page.reload();
	await expect(items).toHaveCount(1);
	await expect(section.getByRole('link', { name: testIndicator.payload.title })).toBeVisible();

	// Remove the last indicator
	await landingPage.header.editModeToggle.check();
	await section.hover();
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	await dialog.getByRole('searchbox').fill(testIndicator.payload.title);
	await dialog.getByRole('article').filter({ hasText: testIndicator.payload.title }).click();
	await dialog.getByRole('button', { name: 'Apply (0)' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(items).toHaveCount(0);
	await expect(section.getByText('Select the indicators to show here.')).toBeVisible();
});

test('Indicators show the data of the organization when the section belongs to it', async ({
	landingPage,
	organizationalUnitWithActualData,
	testIndicator,
	testOrganization
}) => {
	// The actual data of the organizational unit must not show up at the organization
	void organizationalUnitWithActualData;

	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Indicator dashboard');
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const dialog = landingPage.page.getByRole('dialog');
	await dialog.getByRole('searchbox').fill(testIndicator.payload.title);
	await dialog.getByRole('article').filter({ hasText: testIndicator.payload.title }).click();
	await dialog.getByRole('button', { name: 'Apply (1)' }).click();

	await expect(section.getByRole('link', { name: testIndicator.payload.title })).toBeVisible();
	await expect(section.getByText('No data available')).toBeVisible();
});

test('Unavailable indicators can be removed from the selection', async ({
	adminContext,
	isMobile,
	landingPage,
	otherIndicator,
	testIndicator,
	testOrganization
}) => {
	test.skip(isMobile, 'The selection list is hidden on small screens');

	await landingPage.goto(`/${testOrganization.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Indicator dashboard');
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const dialog = landingPage.page.getByRole('dialog');
	for (const indicator of [testIndicator, otherIndicator]) {
		await dialog.getByRole('searchbox').fill(indicator.payload.title);
		await dialog.getByRole('article').filter({ hasText: indicator.payload.title }).click();
	}
	await dialog.getByRole('button', { name: 'Apply (2)' }).click();
	await expect(section.getByRole('article')).toHaveCount(2);

	// The other indicator disappears, but stays in the selection
	await deleteContainer(adminContext, otherIndicator);
	await landingPage.page.reload();
	await landingPage.header.editModeToggle.check();
	await expect(section.getByRole('article')).toHaveCount(1);

	await section.hover();
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const unavailable = dialog
		.locator('.selection-panel .selection-list')
		.getByRole('checkbox', { name: 'Unavailable object' });
	await expect(unavailable).toBeChecked();
	await unavailable.click();
	await expect(unavailable).toHaveCount(0);
	await dialog.getByRole('button', { name: 'Apply (1)' }).click();
	await expect(dialog).not.toBeVisible();

	await landingPage.page.reload();
	await landingPage.header.editModeToggle.check();
	await expect(section.getByRole('article')).toHaveCount(1);
	await section.hover();
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	await expect(dialog.getByRole('button', { name: 'Apply (1)' })).toBeVisible();
	await expect(unavailable).toHaveCount(0);
});
