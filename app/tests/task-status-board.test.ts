import { expect, test } from '@playwright/test';

test('user can add a new task to the board', async ({ page }) => {
	// Navigate to the task status board
	await page.goto('/tasks/status');
	
	// Wait for the board to load
	await expect(page.getByRole('main')).toBeVisible();
	
	// Look for the "Add item" button/link in one of the task status columns
	// The first column should be "task_status.idea" which allows adding new tasks
	const addItemButton = page.getByRole('link', { name: 'Add item' }).first();
	await expect(addItemButton).toBeVisible();
	
	// Click the add item button to open the create task overlay
	await addItemButton.click();
	
	// Wait for the create task form/overlay to appear
	// This should open a modal or overlay with a form for creating a new task
	await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();
	
	// Fill in the task title
	const taskTitle = `Test Task ${Date.now()}`;
	await page.getByRole('textbox', { name: /title/i }).fill(taskTitle);
	
	// Fill in the task description if available
	const descriptionField = page.getByRole('textbox', { name: /description/i });
	if (await descriptionField.isVisible()) {
		await descriptionField.fill('This is a test task created by Playwright');
	}
	
	// Submit the form to create the task
	await page.getByRole('button', { name: /create|save|submit/i }).click();
	
	// Wait for the overlay to close and verify the task appears on the board
	await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible();
	
	// Verify the new task appears in the appropriate column
	await expect(page.getByText(taskTitle)).toBeVisible();
	
	// Verify the task card has the expected structure
	const taskCard = page.locator(`[data-testid="task-card"], .task-card`).filter({ hasText: taskTitle });
	await expect(taskCard).toBeVisible();
});

test('task status board has expected columns', async ({ page }) => {
	await page.goto('/tasks/status');
	
	// Wait for the board to load
	await expect(page.getByRole('main')).toBeVisible();
	
	// Check that the expected task status columns are present
	// Based on the code analysis, these should be the task status options
	const expectedColumns = [
		'task_status.idea',
		'task_status.in_planning', 
		'task_status.in_progress',
		'task_status.completed',
		'task_status.cancelled'
	];
	
	for (const status of expectedColumns) {
		// Check if the column header exists (might be translated)
		const columnHeader = page.getByRole('heading', { level: 2 }).filter({ hasText: new RegExp(status.replace('task_status.', ''), 'i') });
		if (await columnHeader.count() === 0) {
			// If not found by text, look for the column structure
			await expect(page.locator(`[data-status="${status}"], .board-column`)).toBeVisible();
		} else {
			await expect(columnHeader).toBeVisible();
		}
	}
});

test('user can see add item buttons in appropriate columns', async ({ page }) => {
	await page.goto('/tasks/status');
	
	// Wait for the board to load
	await expect(page.getByRole('main')).toBeVisible();
	
	// Check that add item buttons are present
	// Based on the code, these should appear when the user has permission to create tasks
	const addItemButtons = page.getByRole('link', { name: 'Add item' });
	
	// Should have multiple add item buttons (one per column that allows adding)
	await expect(addItemButtons.first()).toBeVisible();
	
	// Verify that clicking an add item button opens the creation interface
	await addItemButtons.first().click();
	
	// Should open a dialog/overlay for creating a new task
	await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();
	
	// Close the dialog
	await page.keyboard.press('Escape');
	await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible();
});