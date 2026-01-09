import { test, expect } from './fixtures';

let suborgTitle: string;
let suborg2Title: string;
let editableTask: string;

test.describe('Permissions', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write rights'
	);
	test.describe('as admin', () => {
		test.use({ storageState: 'tests/.auth/admin.json' });

		test('setup org and suborgs', async ({ page, testOrganization }) => {
			suborgTitle = `Suborg 1 ${test.info().project.name} ${Date.now()}`;
			suborg2Title = `Suborg 2 ${test.info().project.name} ${Date.now()}`;
			editableTask = `Editable Task ${test.info().project.name} ${Date.now()}`;

			await page.goto('/');
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByRole('article', { name: testOrganization.payload.name }).click();
			await page.waitForTimeout(500);
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.waitForTimeout(500);
			await page
				.locator('section')
				.filter({ hasText: 'Level 1' })
				.getByText('Add item')
				.first()
				.click();
			await page.waitForTimeout(500);
			await page.getByRole('textbox', { name: 'Title' }).fill(suborgTitle);
			await page.getByRole('button', { name: 'Save' }).click();
			await page.waitForTimeout(500);
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.waitForTimeout(500);
			await page
				.locator('section')
				.filter({ hasText: 'Level 1' })
				.getByText('Add item')
				.first()
				.click();
			await page.waitForTimeout(500);
			await page.getByRole('textbox', { name: 'Title' }).fill(suborg2Title);
			await page.getByRole('button', { name: 'Save' }).click();
			await page.goto('/');
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.waitForTimeout(500);
			await page.getByRole('link', { name: suborgTitle }).click({ force: true });
			await page.waitForTimeout(500);
			await page.getByRole('button', { name: 'All', exact: true }).click();
			await page.waitForTimeout(500);
			await page.getByRole('menuitem', { name: 'Tasks' }).click();
			await page.waitForTimeout(500);
			await page.getByRole('link', { name: 'Add item' }).first().click();
			await page.getByRole('textbox', { name: 'Title' }).fill(editableTask);
			await page.getByRole('button', { name: 'Save' }).click();
			await page.locator('.overlay').getByRole('link', { name: 'Close' }).click();
			await expect(page.locator('.overlay')).toBeHidden();
			await page.getByTitle(editableTask).click();
			await expect(page.locator('.overlay')).toBeVisible();
			await page.locator('.overlay').getByRole('checkbox', { name: 'Edit mode' }).check();
			await page.getByRole('button', { name: 'Show all properties' }).click();
			await page.getByRole('button', { name: suborgTitle }).click();
			await page.waitForTimeout(500);
			await page.getByRole('radio', { name: suborg2Title }).check();
			await page.locator('.overlay').getByRole('link', { name: 'Close' }).click();
			await page.getByRole('button', { name: 'Organizations and' }).click();
			await page
				.getByRole('article', { name: testOrganization.payload.name })
				.getByLabel('show_related_objects')
				.click();
			await page.waitForTimeout(500);
			await page.getByRole('link', { name: suborg2Title }).click();
			await page.waitForTimeout(500);
			await page.getByRole('link', { name: 'Members' }).click();
			await page.waitForTimeout(500);
			await page.locator('div.details-section .content-actions button.button-primary').click();
			await page.waitForTimeout(500);
			await page.getByRole('textbox', { name: 'Email' }).fill('builderbob@bobby.com');
			await page.getByRole('button', { name: 'Send invitation' }).click();
			await page.getByRole('combobox').selectOption('role.collaborator');
		});
	});

	test.describe('as bob', () => {
		test.use({ storageState: 'tests/.auth/bob.json' });

		test('task editable after sub org switch', async ({ page, testOrganization }) => {
			await page.goto('/');
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByRole('link', { name: testOrganization.payload.name }).click();
			await page.getByRole('button', { name: 'All', exact: true }).click();
			await page.getByRole('menuitem', { name: 'Tasks' }).click();
			await page.waitForTimeout(500);
			await page.getByTitle(editableTask).click();
			await page.locator('.overlay').getByRole('checkbox', { name: 'Edit mode' }).check();
			const fulfillmentDateInput = page.getByLabel('Fulfillment date');
			await expect(fulfillmentDateInput).toBeEditable();
		});
	});

	test.describe('as admin', () => {
		test.use({ storageState: 'tests/.auth/admin.json' });

		test('delete suborgs', async ({ page }) => {
			await page.goto('/');
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByTitle(suborgTitle).click();
			await page.getByLabel('edit mode').check();
			await page.getByRole('button', { name: 'Settings' }).click();
			await page.getByRole('button', { name: `Delete ${suborgTitle}` }).click();
			await page.getByRole('button', { name: `I want to delete "${suborgTitle}` }).click();
			await page.goto('/');
			await expect(page.getByTitle(suborgTitle)).not.toBeAttached();
			await page.getByRole('button', { name: 'Organizations and organizational units' }).click();
			await page.getByTitle(suborg2Title).click();
			await page.getByLabel('edit mode').check();
			await page.getByRole('button', { name: 'Settings' }).click();
			await page.getByRole('button', { name: `Delete ${suborg2Title}` }).click();
			await page.getByRole('button', { name: `I want to delete "${suborg2Title}` }).click();
			await expect(page.getByTitle(suborg2Title)).not.toBeAttached();
		});
	});
});
