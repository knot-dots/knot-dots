import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

// Define the directory where the authentication state will be saved
const authDir = path.join('./tests/.auth');

const persons = [
	{
		name: 'Ada Adagio',
		mail: 'admin@knotdots.net',
		passw: 'test',
		file_name: 'admin'
	},
	{
		name: 'Bob Builder',
		mail: 'builderbob@bobby.com',
		passw: 'schnabeltasse',
		file_name: 'bob'
	}
];

persons.forEach((person) => {
	setup(`authenticate as ${person.name}`, async ({ page }) => {
		// Navigate to the login page
		await page.goto('/');
		await page.getByRole('button', { name: 'Log in' }).click();

		// Perform the login actions
		await page.getByRole('textbox', { name: 'Email' }).fill(person.mail);
		await page.getByRole('textbox', { name: 'Password' }).fill(person.passw);
		await page.getByRole('button', { name: 'Sign In' }).click();

		// Wait for the application to be successfully logged in
		await expect(page).toHaveTitle('knotdots.net / All');

		// Add an assertion to confirm successful login
		await expect(page.getByText(person.name)).toBeVisible();

		// Enable feature flags required for some tests
		await page.getByRole('navigation').getByRole('button', { name: 'User menu' }).click();
		await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
		await page.getByRole('dialog').getByLabel('CustomCategories').check();
		await page.getByRole('dialog').getByLabel('IOOI').check();
		await page.getByRole('dialog').getByLabel('Report').check();
		await page.getByRole('dialog').getByLabel('ResourceV2').check();
		await page.getByRole('dialog').getByLabel('SubMeasures').check();
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		// Save the authenticated state to a file
		const authFile = path.join(authDir, person.file_name + '.json');
		await page.context().storageState({ path: authFile });
	});
});
