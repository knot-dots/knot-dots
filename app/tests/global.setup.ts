import { test as setup } from '@playwright/test';

setup('insert test organization', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Organizations and' }).click();
	await page.getByText('Add item').click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Test organization');
	await page.locator('div.label:has-text("Boards") + div.dropdown').getByRole('button').first().click();
	await page.getByRole('checkbox', { name: 'Organizational units' }).check();
	await page.getByRole('button', { name: 'Save' }).click();
});

setup('insert test goal', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'All', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Goals' }).click();
	await page.getByText('Add item').click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Test goal');
	await page.getByRole('button', { name: 'Save' }).click();
});

setup('insert test program', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'All', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Programs' }).click();
	await page.getByRole('button', { name: 'Program', exact: true }).click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Test program');
	await page.getByRole('button', { name: 'Save' }).click();
});

setup('insert test measure', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'All', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Measures' }).click();
	await page.getByText('Add item').first().click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Test measure');
	await page.getByRole('button', { name: 'Save' }).click();
});

setup('insert goal with task', async ({ page }) => {
	await page.goto('/');

	// Add goal
	await page.getByRole('button', { name: 'All', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Goals' }).click();
	await page.getByText('Add item').click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Goal with task');
	await page.getByRole('button', { name: 'Save' }).click();

	// Add tasks section
	const overlay = page.locator('.overlay');
	await overlay.getByRole('checkbox', { name: 'Edit mode', exact: true }).check();
	await page.getByRole('button', { name: 'Add section' }).click();
	await page.getByRole('menuitem', { name: 'Tasks' }).click();

	// Add test task of category design
	const taskSection = page.locator('form').filter({ hasText: 'Tasks' }).first();
	await taskSection.getByRole('button', { name: 'Add item' }).click({ force: true });
	await page.getByRole('textbox', { name: 'Title' }).fill('Test task');
	await page.getByRole('button', { name: 'Task' }).click();
	await page.locator('label').filter({ hasText: 'Design' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
});
