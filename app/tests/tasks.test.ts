import { expect, test } from './fixtures';

test.describe('Task status board', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('task status can be changed via drag-and-drop', async ({
		isMobile,
		taskStatusBoard,
		testTask
	}) => {
		test.skip(isMobile, 'Drag-and-drop is not supported on mobile');

		await taskStatusBoard.goto(`/${testTask.organization}`);

		await expect(taskStatusBoard.column('Idea').card(testTask.payload.title)).toBeVisible();
		await taskStatusBoard.moveCardToColumn(testTask.payload.title, 'In Planning');
		await expect(taskStatusBoard.column('In Planning').card(testTask.payload.title)).toBeVisible();

		// Verify persistence
		await taskStatusBoard.page.reload();
		await expect(taskStatusBoard.column('In Planning').card(testTask.payload.title)).toBeVisible();
	});
});

test.describe('Subtask creation', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('subtask can be created and persists', async ({ taskStatusBoard, testTask }) => {
		await taskStatusBoard.goto(`/${testTask.organization}`);

		await taskStatusBoard.card(testTask.payload.title).click();
		await taskStatusBoard.overlay.editModeToggle.check();

		const subtaskSection = await taskStatusBoard.overlay.addSection('Tasks');
		const subtaskTitle = `Subtask ${Date.now()}`;

		await subtaskSection.getByRole('button', { name: 'Add item' }).click();
		await taskStatusBoard.page.getByRole('textbox', { name: 'Title' }).fill(subtaskTitle);
		await taskStatusBoard.page.getByRole('button', { name: 'Save' }).click();
		await expect(taskStatusBoard.overlay.title).toHaveText(subtaskTitle);

		await taskStatusBoard.overlay.backButton.click();
		await expect(subtaskSection.getByTitle(subtaskTitle)).toBeVisible();
		await expect(subtaskSection.getByTitle(testTask.payload.title)).not.toBeVisible();

		// Verify persistence
		await taskStatusBoard.page.reload();
		await expect(subtaskSection.getByTitle(subtaskTitle)).toBeVisible();
		await expect(subtaskSection.getByTitle(testTask.payload.title)).not.toBeVisible();
	});
});
