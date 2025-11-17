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
  const taskSection = page.locator('form').filter({ hasText: 'Tasks' }).first()
  await taskSection.getByRole('button', { name: 'Add item' }).click({ force: true });
  await page.getByRole('textbox', { name: 'Title' }).fill('Test task');
  await page.getByRole('button', { name: 'Task' }).click();
  await page.locator('label').filter({ hasText: 'Design' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
});
