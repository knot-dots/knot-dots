import { expect, test } from './fixtures';

test.use({ suiteId: 'tasks' });

test.describe('Task status board', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('task status can be changed via drag-and-drop', async ({
		isMobile,
		taskStatusBoard,
		testOrganization
	}) => {
		test.skip(isMobile, 'Drag-and-drop is not supported on mobile');

		await taskStatusBoard.goto(`/${testOrganization.guid}`);
		await taskStatusBoard.addTaskToColumn('Task 1', 'Idea');
		await taskStatusBoard.addTaskToColumn('Task 2', 'In Planning');
		await taskStatusBoard.addTaskToColumn('Task 3', 'In Planning');

		const saveResponse = taskStatusBoard.page.waitForResponse((r) => r.url().includes('/revision'));
		await taskStatusBoard.moveCardToColumn('Task 1', 'In Planning', 1);
		await expect(
			taskStatusBoard.column('In Planning').locator.getByRole('listitem').nth(1)
		).toHaveText('Task 1');

		// Assert card does not move up or down because of re-rendering triggered
		// by optimistic update
		await saveResponse;
		await taskStatusBoard.page.waitForTimeout(100);
		await expect(
			taskStatusBoard.column('In Planning').locator.getByRole('listitem').nth(1)
		).toHaveText('Task 1');

		// Verify persistence
		await taskStatusBoard.page.reload();
		await expect(
			taskStatusBoard.column('In Planning').locator.getByRole('listitem').nth(1)
		).toHaveText('Task 1');
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

		await subtaskSection.getByRole('button', { name: 'Add item' }).first().click();
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
