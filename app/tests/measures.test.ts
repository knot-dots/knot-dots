import { expect, test } from './fixtures';

test.use({ suiteId: 'measures' });

test.describe('Measure monitoring', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('create goals and tasks', async ({
		dotsBoard,
		isMobile,
		testOrganization,
		testProgram,
		testMeasure
	}) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');

		const teamPermissions = `${testOrganization.payload.name} / Team ${testProgram.payload.title}`;

		await dotsBoard.goto(`/${testOrganization.guid}`);

		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Assert the measure inherits team permissions from its program
		await expect(
			dotsBoard.overlay.locator.locator(':has-text("Team permissions") + .value')
		).toHaveText(teamPermissions);

		// Switch to the monitoring workspace
		await dotsBoard.overlay.locator.getByRole('button', { name: 'Page' }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Monitoring' }).click();
		// Switching the workspace reloads the overlay board client-side; allow for the fetch.
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Goals' })).toBeVisible({
			timeout: 15000
		});
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Tasks' })).toBeVisible();

		for (const item of ['Goal', 'Task']) {
			const title = `${item} for ${testMeasure.payload.title}`;

			// Create a new item
			const column = dotsBoard.overlay.locator.locator('section', { hasText: item });
			await column.getByRole('button', { name: 'Add item' }).first().click();
			await dotsBoard.page.getByRole('textbox', { name: 'Title' }).fill(title);
			await dotsBoard.page.getByRole('button', { name: 'Save' }).click();

			// Verify the created item is part of the measure and managed by the same team
			await expect(dotsBoard.overlay.title).toHaveText(title);
			await dotsBoard.overlay.disclosePropertiesButton.click();
			await expect(dotsBoard.overlay.locator.getByLabel('Measure', { exact: true })).toHaveText(
				testMeasure.payload.title
			);
			await expect(
				dotsBoard.overlay.locator.locator(':has-text("Team permissions") + .value')
			).toHaveText(teamPermissions);

			// Delete the item
			await dotsBoard.overlay.delete();
		}
	});
});

test.describe('Measures section', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('sub-measure can be created and persists', async ({ dotsBoard, testMeasure }) => {
		await dotsBoard.goto(`/${testMeasure.organization}`);
		await dotsBoard.card(testMeasure.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		const subMeasureSection = await dotsBoard.overlay.addSection('Measures');
		const subMeasureTitle = `Sub-measure ${Date.now()}`;

		await subMeasureSection.getByRole('button', { name: 'Add item' }).first().click();
		await dotsBoard.page
			.getByRole('dialog')
			.getByRole('textbox', { name: 'Title' })
			.fill(subMeasureTitle);
		await dotsBoard.page.getByRole('dialog').getByLabel('Measure type').click();
		await dotsBoard.page.getByRole('dialog').getByRole('radio', { name: 'Module' }).click();
		await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		await dotsBoard.overlay.backButton.click();
		await expect(subMeasureSection.getByRole('heading', { level: 2 })).toHaveText('Modules');
		await expect(subMeasureSection.getByTitle(subMeasureTitle)).toBeVisible();
		await expect(subMeasureSection.getByTitle(testMeasure.payload.title)).not.toBeVisible();

		// Verify persistence
		await dotsBoard.page.reload();
		await expect(subMeasureSection.getByTitle(subMeasureTitle)).toBeVisible();
		await expect(subMeasureSection.getByTitle(testMeasure.payload.title)).not.toBeVisible();
	});

	test('measures can be displayed in section on organization page', async ({
		landingPage,
		testMeasure
	}) => {
		await landingPage.goto(`/${testMeasure.organization}`);
		await landingPage.header.editModeToggle.check();
		await landingPage.addSection('Measures');
		await expect(
			landingPage.sections
				.filter({ has: landingPage.page.getByRole('heading', { level: 2, name: 'Measures' }) })
				.getByRole('heading', { name: testMeasure.payload.title })
		).toBeVisible();
	});
});
