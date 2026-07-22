import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { createUser } from './fixtures';

// Define the directory where the authentication state will be saved
const authDir = path.join('./tests/.auth');

interface Person {
	name: string;
	mail: string;
	passw: string;
	file_name: string;
	firstName?: string;
	lastName?: string;
	provision?: boolean;
	realmRoles?: string[];
}

const persons: Person[] = [
	{
		name: 'Ada Adagio',
		mail: 'admin@knotdots.net',
		passw: 'test',
		file_name: 'admin'
	},
	{
		name: 'Bob Bow',
		firstName: 'Bob',
		lastName: 'Builder',
		mail: 'bob@example.org',
		passw: 'schnabeltasse',
		file_name: 'bob',
		provision: true,
		realmRoles: ['alpha-testing']
	},
	{
		// A regular organization admin without the sysadmin realm role. Tests should
		// prefer this identity over Ada Adagio so that they exercise the scoped
		// permission checks instead of the unconditional sysadmin branch.
		name: 'Orla Orchestra',
		firstName: 'Orla',
		lastName: 'Orchestra',
		mail: 'orla@example.org',
		passw: 'milchkaennchen',
		file_name: 'orgadmin',
		provision: true,
		realmRoles: ['alpha-testing']
	}
];

persons.forEach((person) => {
	setup(`authenticate as ${person.name}`, async ({ page, playwright }) => {
		// Provision users that are not part of the imported realm directly in Keycloak
		if (person.provision) {
			await createUser(playwright.request, {
				email: person.mail,
				firstName: person.firstName as string,
				lastName: person.lastName as string,
				password: person.passw,
				realmRoles: person.realmRoles
			});
		}

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
		await expect(
			page.getByRole('navigation').getByRole('button', { name: 'User menu' })
		).toBeVisible();

		// Enable feature flags required for some tests
		await page.getByRole('navigation').getByRole('button', { name: 'User menu' }).click();
		await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
		await page.getByRole('dialog').getByLabel('ImportFromCsv').check();
		await page.getByRole('dialog').getByLabel('IOOI').check();
		await page.getByRole('dialog').getByLabel('ResourceV2').check();
		await page.getByRole('dialog').getByLabel('SubMeasures').check();
		await page.getByRole('dialog').getByLabel('BulkActions').check();
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		// Save the authenticated state to a file
		const authFile = path.join(authDir, person.file_name + '.json');
		await page.context().storageState({ path: authFile });
	});
});
