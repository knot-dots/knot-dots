import { test, expect } from './fixtures';

let suborgTitle: string;
let suborg2Title: string;
let editableTask: string;

test.describe('Permissions', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);
	test.describe('as admin', () => {
		test.use({ storageState: 'tests/.auth/admin.json' });

		// Todo: enable test again when flaky behavior is resolved
		test.skip('setup org and suborgs', async ({ page, testOrganization }) => {
			suborgTitle = `Suborg 1 ${test.info().project.name} ${Date.now()}`;
			suborg2Title = `Suborg 2 ${test.info().project.name} ${Date.now()}`;
			editableTask = `Editable Task ${test.info().project.name} ${Date.now()}`;

			const orgMenuButton = page.getByRole('button', {
				name: 'Organizations and organizational units'
			});

			await page.goto('/');
			await orgMenuButton.click();
			await page.waitForTimeout(150);
			await page.getByRole('article', { name: testOrganization.payload.name }).click();
			await expect(
				page.getByRole('heading', { level: 1, name: testOrganization.payload.name })
			).toBeVisible();
			await orgMenuButton.click();
			await page.waitForTimeout(150);
			await page
				.locator('section')
				.filter({ hasText: 'Level 1' })
				.getByText('Add item')
				.first()
				.click();
			await page.getByRole('textbox', { name: 'Title' }).fill(suborgTitle);
			await page.getByRole('button', { name: 'Save' }).click();
			await expect(page.getByRole('heading', { level: 1, name: suborgTitle })).toBeVisible();
			await orgMenuButton.click();
			await page.waitForTimeout(150);
			await page
				.locator('section')
				.filter({ hasText: 'Level 1' })
				.getByText('Add item')
				.first()
				.click();
			await page.getByRole('textbox', { name: 'Title' }).fill(suborg2Title);
			await page.getByRole('button', { name: 'Save' }).click();
			await page.goto('/');
			await orgMenuButton.click();
			await page.waitForTimeout(150);
			await page.getByRole('article', { name: suborgTitle }).click();
			await page.getByRole('button', { name: 'All', exact: true }).click();
			await page.getByRole('menuitem', { name: 'Tasks' }).click();
			await page.getByRole('button', { name: 'Add item' }).first().click();
			await page.getByRole('textbox', { name: 'Title' }).fill(editableTask);
			await page.getByRole('button', { name: 'Save' }).click();
			await page.locator('.overlay').getByRole('link', { name: 'Close' }).click();
			await expect(page.locator('.overlay')).toBeHidden();
			await page.getByTitle(editableTask).click();
			await expect(page.locator('.overlay')).toBeVisible();
			await page.locator('.overlay').getByRole('checkbox', { name: 'Edit mode' }).check();
			await page.getByRole('button', { name: 'Show all properties' }).click();
			await page.getByRole('button', { name: 'Organizational unit' }).click();
			await page.getByRole('radio', { name: suborg2Title }).check();
			await page.waitForTimeout(2100);
			await page.locator('.overlay').getByRole('link', { name: 'Close' }).click();
			await page.getByRole('button', { name: 'Organizations and' }).click();
			await page
				.getByRole('article', { name: testOrganization.payload.name })
				.getByLabel('show_related_objects')
				.click();
			await page.getByRole('link', { name: suborg2Title }).click();
			await page.getByRole('link', { name: 'Members' }).click();
			await page.locator('div.details-section .content-actions button.button-primary').click();
			await page.getByRole('textbox', { name: 'Email' }).fill('builderbob@bobby.com');
			await page.getByRole('button', { name: 'Send invitation' }).click();
			await page.getByRole('combobox').selectOption('role.collaborator');
		});
	});

	test.describe('as bob', () => {
		test.use({ storageState: 'tests/.auth/bob.json' });

		// Todo: enable test again when flaky behavior is resolved
		test.skip('task editable after sub org switch', async ({ page, testOrganization }) => {
			await page.goto('/');
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByRole('link', { name: testOrganization.payload.name }).click();
			await expect(
				page.getByRole('heading', { level: 1, name: testOrganization.payload.name })
			).toBeVisible();
			await page.getByRole('button', { name: 'All', exact: true }).click();
			await page.getByRole('menuitem', { name: 'Tasks' }).click();
			await page.getByTitle(editableTask).click();
			await page.locator('.overlay').getByRole('checkbox', { name: 'Edit mode' }).check();
			const fulfillmentDateInput = page.getByLabel('Fulfillment date');
			await expect(fulfillmentDateInput).toBeEditable();
		});
	});

	test.describe('as admin', () => {
		test.use({ storageState: 'tests/.auth/admin.json' });

		// Todo: enable test again when flaky behavior is resolved
		test.skip('delete suborgs', async ({ page }) => {
			await page.goto('/');
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByTitle(suborgTitle).click();
			await expect(page.getByRole('heading', { level: 1, name: suborgTitle })).toBeVisible();
			await page.getByLabel('edit mode').check();
			await page.getByRole('button', { name: 'Settings' }).click();
			await page.getByRole('button', { name: `Delete ${suborgTitle}` }).click();
			await page.getByRole('button', { name: `I want to delete "${suborgTitle}` }).click();
			await page.goto('/');
			await expect(page.getByTitle(suborgTitle)).not.toBeAttached();
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByTitle(suborg2Title).click();
			await expect(page.getByRole('heading', { level: 1, name: suborg2Title })).toBeVisible();
			await page.getByLabel('edit mode').check();
			await page.getByRole('button', { name: 'Settings' }).click();
			await page.getByRole('button', { name: `Delete ${suborg2Title}` }).click();
			await page.getByRole('button', { name: `I want to delete "${suborg2Title}` }).click();
			await expect(page.getByTitle(suborg2Title)).not.toBeAttached();
		});
	});

	test.describe('changing the organizational unit of a measure propagates to its descendant elements', () => {
		test.use({ storageState: 'tests/.auth/admin.json' });

		test('change the organizational unit of a measure', async ({
			dotsBoard,
			testOrganizationalUnit,
			testProgram,
			testMeasure
		}) => {
			await dotsBoard.goto(`/${testMeasure.organization}`);
			await dotsBoard.card(testMeasure.payload.title).click();
			await dotsBoard.overlay.editModeToggle.check();

			// Add a goal to this measure via the goals section
			const dialog = dotsBoard.page.getByRole('dialog');
			const section = await dotsBoard.overlay.addSection('Goals');
			await expect(section).toBeVisible();
			const titleOfFirstGoal = 'First goal';
			await section.getByRole('button', { name: 'Add item' }).click();

			await expect(dialog.getByRole('button', { name: 'Measure' })).toHaveText(
				testMeasure.payload.title
			);
			await dialog.getByRole('textbox', { name: 'Title' }).fill(titleOfFirstGoal);
			await dialog.getByRole('button', { name: 'Save' }).click();
			await expect(
				dotsBoard.overlay.locator.getByRole('heading', { name: titleOfFirstGoal })
			).toBeVisible();

			// Change the organizational unit of the measure
			await dotsBoard.overlay.backButton.click();
			await expect(
				dotsBoard.overlay.locator.getByRole('heading', { name: testMeasure.payload.title })
			).toBeVisible();
			await dotsBoard.overlay.locator.getByLabel('Organizational unit').click();
			const invalidateRequest = dotsBoard.page.waitForRequest(/x-sveltekit-invalidated/);
			await dotsBoard.overlay.locator.getByLabel(testOrganizationalUnit.payload.name).click();
			await invalidateRequest;

			// Assert descendant goal' organizational unit is updated, too
			await section.getByRole('link', { name: titleOfFirstGoal }).click();
			await expect(
				dotsBoard.overlay.locator.getByRole('heading', { name: titleOfFirstGoal })
			).toBeVisible();
			await expect(dotsBoard.page.getByRole('button', { name: 'Organizational unit' })).toHaveText(
				testOrganizationalUnit.payload.name
			);

			// Assert program is not affected by changing the organizational unit of its descendant measure
			await dotsBoard.overlay.closeButton.click();
			await dotsBoard.card(testProgram.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
			await expect(
				dotsBoard.overlay.locator.getByRole('button', { name: 'Organizational unit' })
			).toHaveText('Empty');

			// Assert newly added goals inherit the organizational unit of the measure
			await dotsBoard.card(testMeasure.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(testMeasure.payload.title);
			await section.getByRole('button', { name: 'Add item' }).click();
			await expect(dialog.getByRole('button', { name: 'Measure' })).toHaveText(
				testMeasure.payload.title
			);
			await expect(dialog.getByRole('button', { name: 'Organizational unit' })).toHaveText(
				testOrganizationalUnit.payload.name
			);
		});
	});
});
