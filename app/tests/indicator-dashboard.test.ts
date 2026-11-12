import {
	type ActualDataPayload,
	type Container,
	containerOfType,
	type IndicatorPayload,
	payloadTypes
} from '$lib/models';
import { createContainer, deleteContainer, expect, test as base } from './fixtures';

const test = base.extend<{
	actualValues: Container<ActualDataPayload>;
	otherIndicator: Container<IndicatorPayload>;
}>({
	// Actual values of the test indicator for the organization
	actualValues: async ({ adminContext, testIndicator, testOrganization }, use) => {
		const newActualData = containerOfType(
			payloadTypes.enum.actual_data,
			testOrganization
		) as Container<ActualDataPayload>;
		const actualValues = await createContainer(adminContext, {
			...newActualData,
			payload: {
				...newActualData.payload,
				indicator: testIndicator.guid,
				title: testIndicator.payload.title,
				values: [
					[2022, 40],
					[2023, 42.5]
				]
			}
		});

		await use(actualValues);

		await deleteContainer(adminContext, actualValues);
	},
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

	// Changes that are not applied are dropped
	await section.hover();
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	await dialog.getByRole('searchbox').fill(otherIndicator.payload.title);
	await dialog.getByRole('article').filter({ hasText: otherIndicator.payload.title }).click();
	await expect(dialog.getByRole('button', { name: 'Apply (1)' })).toBeVisible();
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).not.toBeVisible();

	// Remove one indicator
	await section.hover();
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	await expect(dialog.getByRole('button', { name: 'Apply (2)' })).toBeVisible();
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

test('Cards are placed in a grid and open from their title row only', async ({
	isMobile,
	landingPage,
	organizationalUnitWithActualData,
	otherIndicator,
	testIndicator
}) => {
	test.skip(isMobile, 'On small screens every card takes the whole row');

	await landingPage.goto(`/${organizationalUnitWithActualData.guid}`);
	await landingPage.header.editModeToggle.check();

	const section = await landingPage.addSection('Indicator dashboard');
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const dialog = landingPage.page.getByRole('dialog');
	for (const indicator of [testIndicator, otherIndicator]) {
		await dialog.getByRole('searchbox').fill(indicator.payload.title);
		await dialog.getByRole('article').filter({ hasText: indicator.payload.title }).click();
	}
	await dialog.getByRole('button', { name: 'Apply (2)' }).click();
	await expect(dialog).not.toBeVisible();

	// New indicators are two columns wide, so they stand side by side
	const cards = section.getByRole('article');
	await expect(cards).toHaveCount(2);
	const [first, second] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
	expect(second?.y).toBe(first?.y);
	expect(second!.x).toBeGreaterThan(first!.x + first!.width);

	// A click into the body of the card opens nothing
	const card = cards.nth(0);
	await card.getByText('No data available').click();
	await expect(landingPage.page).not.toHaveURL(/view=/);

	// A click anywhere in the title row opens the indicator, and its card shows it is selected
	await card.locator('header').click({ position: { x: 4, y: 4 } });
	await expect(landingPage.page).toHaveURL(new RegExp(`view=${testIndicator.guid}`));
	await expect(card).toHaveClass(/is-active/);
	await expect(cards.nth(1)).not.toHaveClass(/is-active/);
});

test('Cards are set up and arranged from their menu', async ({
	actualValues,
	isMobile,
	landingPage,
	otherIndicator,
	testIndicator,
	testOrganization
}) => {
	test.skip(isMobile, 'On small screens every card takes the whole row');
	void actualValues;

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
	await expect(dialog).not.toBeVisible();

	const cards = section.getByRole('article');
	await expect(cards).toHaveCount(2);
	const card = cards.filter({ hasText: testIndicator.payload.title });
	const { height, width } = (await card.boundingBox())!;

	// The title row shows the menu button, and Esc closes the menu from within
	await card.getByRole('heading').hover();
	const settings = card.getByRole('button', { name: 'Settings' });
	await settings.click();
	const menu = card.getByRole('group');
	await menu.getByRole('button', { name: 'Move back' }).focus();
	await landingPage.page.keyboard.press('Escape');
	await expect(menu).toBeHidden();
	await expect(settings).toBeFocused();

	// The menu shows the indicator as a figure and changes its height and width
	await settings.click();
	const choose = (setting: string, option: string) =>
		menu.getByRole('radiogroup', { name: setting }).getByText(option, { exact: true }).click();
	await choose('View', 'Figure');
	await expect(card.getByText('Actual value 2023')).toBeVisible();
	await expect(card.getByText('42.5', { exact: true })).toBeVisible();
	await choose('Height', 'small');
	await expect.poll(async () => (await card.boundingBox())?.height).toBeLessThan(height);
	await choose('Width', '4');
	await expect.poll(async () => (await card.boundingBox())?.width).toBeGreaterThan(width);

	// The menu and the keyboard change the order
	await menu.getByRole('button', { name: 'Move back' }).click();
	await expect(cards.nth(1)).toContainText(testIndicator.payload.title);
	const saved = landingPage.page.waitForResponse(
		(response) => response.url().endsWith('/revision') && response.request().method() === 'POST'
	);
	await card.getByRole('link', { name: testIndicator.payload.title }).press('Alt+ArrowLeft');
	await expect(cards.nth(0)).toContainText(testIndicator.payload.title);

	// The section saves the changes
	expect((await saved).ok()).toBe(true);
	await landingPage.page.reload();
	await expect(cards.nth(0)).toContainText(testIndicator.payload.title);
	await expect(cards.nth(0).getByText('Actual value 2023')).toBeVisible();

	// Without edit mode, cards have no menu
	await expect(cards.nth(0).getByRole('button', { name: 'Settings' })).toHaveCount(0);

	// Removing takes the indicator out of the dashboard
	await landingPage.header.editModeToggle.check();
	const other = cards.filter({ hasText: otherIndicator.payload.title });
	await other.getByRole('heading').hover();
	await other.getByRole('button', { name: 'Settings' }).click();
	await other.getByRole('button', { name: 'Remove' }).click();
	await expect(cards).toHaveCount(1);
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
