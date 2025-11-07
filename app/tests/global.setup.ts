import { test as setup } from '@playwright/test';

setup('insert test organization', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Organizations and' }).click();
	await page.getByText('Add item').click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Test organization');
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
