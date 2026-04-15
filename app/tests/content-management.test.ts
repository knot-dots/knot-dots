import path from 'node:path';
import { expect, test } from './fixtures';

test.use({ suiteId: 'content-management' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('stage', async ({ page, testOrganization }) => {
	await page.goto(`/${testOrganization.guid}/all/page`);
	await page.getByRole('checkbox', { name: 'Edit mode' }).check();

	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Add cover' }).click();
	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(path.resolve(import.meta.dirname, 'cover.jpeg'));

	await page.getByRole('dialog').getByRole('button', { name: 'Upload' }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByRole('img', { name: 'Cover' })).toBeVisible();
});

test('create and delete', async ({ dotsBoard, testOrganization }) => {
	await dotsBoard.goto(`${testOrganization.guid}`);

	const titleForFirstGoal = `First Goal`;
	const titleForSecondGoal = `Second Goal`;

	// Enable edit mode
	await dotsBoard.header.editModeToggle.check();

	// Create first object
	await dotsBoard.column('Goals').addItemButton.click();
	const dialog = dotsBoard.page.getByRole('dialog');
	await dialog.getByRole('textbox', { name: 'Title' }).fill(titleForFirstGoal);
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleForFirstGoal);
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.overlay.locator).not.toBeVisible();

	// Create second object and keep overlay open
	await dotsBoard.column('Goals').addItemButton.click();
	await dialog.getByRole('textbox', { name: 'Title' }).fill(titleForSecondGoal);
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleForSecondGoal);
	await expect(dotsBoard.overlay.deleteButton).toBeVisible();

	// Verify both cards are visible
	await expect(dotsBoard.card(titleForFirstGoal)).toBeVisible();
	await expect(dotsBoard.card(titleForSecondGoal)).toBeVisible();

	// Re-open the first object
	await dotsBoard.card(titleForFirstGoal).click();
	await expect(dotsBoard.overlay.title).toHaveText(titleForFirstGoal);

	// Click delete
	await dotsBoard.overlay.deleteButton.click();

	// Verify confirmation dialog
	const confirmDialog = dotsBoard.page.getByRole('dialog');
	await expect(confirmDialog.getByRole('heading')).toHaveText(`Delete ${titleForFirstGoal}`);
	await expect(confirmDialog.getByText('Do you really want to delete this object?')).toBeVisible();
	await expect(
		confirmDialog.getByRole('button', { name: `I want to delete "${titleForFirstGoal}"` })
	).toBeVisible();

	// Confirm delete
	await confirmDialog
		.getByRole('button', { name: `I want to delete "${titleForFirstGoal}"` })
		.click();

	// Verify Goal 1 is gone, Goal 2 is still there
	await expect(dotsBoard.card(titleForFirstGoal)).not.toBeVisible();
	await expect(dotsBoard.card(titleForSecondGoal)).toBeVisible();
});
