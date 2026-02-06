import { expect, test } from './fixtures';

test.describe('Resource Data Collections', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('add Actual resource allocation section to measure', async ({
		dotsBoard,
		isMobile,
		testMeasure
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourcesV2 feature flag
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open measure overlay and enable edit mode
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Actual resource allocation section
		const section = await dotsBoard.overlay.addSection('Actual resource allocation');

		// Verify section heading is visible
		await expect(section.getByRole('heading', { level: 2 })).toHaveText(
			'Actual resource allocation'
		);

		// Clean up - delete the section
		await dotsBoard.overlay.deleteSection(section);
	});

	test('create resource data item in section', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open measure overlay and enable edit mode
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Actual resource allocation section
		const section = await dotsBoard.overlay.addSection('Actual resource allocation');

		// Create a resource data item
		const resourceDataTitle = `Resource Data ${Date.now()}`;
		await section.getByRole('button', { name: 'Add item' }).first().click();

		// Select the resource from the grouped dropdown
		await dotsBoard.page.getByRole('dialog').getByLabel('Resource').click();
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) })
			.check();

		// Fill in the title
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('textbox', { name: 'Title' })
			.fill(resourceDataTitle);

		// Save the item
		await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		// Navigate back to the measure overlay
		await dotsBoard.overlay.backButton.click();

		// Verify the ResourceDataCard appears in the section
		await expect(section.getByTitle(resourceDataTitle)).toBeVisible();

		// Clean up - delete the created item
		await section.getByTitle(resourceDataTitle).click();
		await dotsBoard.overlay.delete();
		await dotsBoard.overlay.deleteSection(section);
	});

	test('add entries to resource data table', async ({
		dotsBoard,
		isMobile,
		testMeasure,
		testResourceV2
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Enable ResourceV2 feature flag
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.sidebar.openProfileSettings();
		await dotsBoard.page.getByLabel('ResourceV2').check();
		const response = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: 'Save' }).click();
		await response;

		// Open measure overlay and enable edit mode
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add Actual resource allocation section
		const section = await dotsBoard.overlay.addSection('Actual resource allocation');

		// Create a resource data item
		const resourceDataTitle = `Resource Data ${Date.now()}`;
		await section.getByRole('button', { name: 'Add item' }).first().click();

		// Select the resource from the grouped dropdown
		await dotsBoard.page.getByRole('dialog').getByLabel('Resource').click();
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('radio', { name: new RegExp(testResourceV2.payload.title) })
			.check();

		// Fill in the title
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('textbox', { name: 'Title' })
			.fill(resourceDataTitle);

		// Save and open the item
		await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		// Verify we're in the resource data detail view
		await expect(dotsBoard.overlay.title).toHaveText(resourceDataTitle);

		// Verify the table is visible
		const table = dotsBoard.overlay.locator.locator('table');
		await expect(table).toBeVisible();

		// Add a year column using the right "+" button
		await table.locator('thead th:last-child button').click();

		// Verify a new column appeared with the current year
		const currentYear = new Date().getFullYear();
		await expect(table.getByRole('columnheader', { name: String(currentYear) })).toBeVisible();

		// Input an amount in the new column and wait for save
		const amountInput = table.locator('tbody td input[inputmode="decimal"]').last();
		await amountInput.fill('1500.50');
		const saveResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await amountInput.blur();
		await saveResponse;

		// Navigate back to verify the card shows the updated total
		await dotsBoard.overlay.backButton.click();
		await expect(section.getByTitle(resourceDataTitle)).toBeVisible();

		// The total should now show 1,500.5 (or similar formatted)
		await expect(section.locator('.resource-data-card__amount')).toContainText('1,500');

		// Clean up - delete the created item and section
		await section.getByTitle(resourceDataTitle).click();
		await dotsBoard.overlay.delete();
		await dotsBoard.overlay.deleteSection(section);
	});
});
