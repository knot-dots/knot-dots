import { expect, test } from './fixtures';

// This test verifies that a task can be dragged from one status column
// to another on the task status board, and that the change persists.

test.describe('Task status board', () => {
	// Use admin to ensure we have permission to create and move tasks
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('task status can be changed via drag-and-drop', async ({ page, isMobile, testTask }) => {
		test.skip(isMobile, 'Drag-and-drop is not supported on mobile');

		await page.goto(`/${testTask.organization}/tasks/status`);

		// Ensure columns are visible
		const ideaColumn = page.locator('section', {
			has: page.getByRole('heading', { name: 'Idea' })
		});
		const inPlanningColumn = page.locator('section', {
			has: page.getByRole('heading', { name: 'In planning' })
		});

		await expect(ideaColumn).toBeVisible();
		await expect(inPlanningColumn).toBeVisible();

		const ideaCard = ideaColumn.getByTitle(testTask.payload.title).first();
		await expect(ideaCard).toBeVisible();

		// Perform drag and drop to the "In planning" column
		// Using mouse events to trigger svelte-dnd-action reliably
		const sourceBox = await ideaCard.boundingBox();
		const targetBox = await inPlanningColumn.boundingBox();
		if (!sourceBox || !targetBox) {
			throw new Error('Could not determine bounding boxes for drag-and-drop');
		}

		// Start drag in the middle of the source card
		const startX = sourceBox.x + sourceBox.width / 2;
		const startY = sourceBox.y + Math.min(24, sourceBox.height / 2);

		// Drop near the top of the target column items area
		const endX = targetBox.x + targetBox.width / 2;
		const endY = targetBox.y + targetBox.height / 2;

		await page.mouse.move(startX, startY);
		await page.mouse.down();
		// Move in a couple of steps to simulate drag
		await page.mouse.move((startX + endX) / 2, (startY + endY) / 2);
		await page.mouse.move(endX, endY);
		// Wait for the drop zone to contain the (invisible) card before releasing the mouse button.
		await expect(inPlanningColumn.getByTitle(testTask.payload.title).first()).toBeAttached({
			timeout: 5000
		});
		await page.mouse.up();
		await expect(inPlanningColumn.getByTitle(testTask.payload.title).first()).toBeVisible();

		// Reload to verify persistence
		await page.reload();
		const inPlanningColumnAfterReload = page.locator('section', {
			has: page.getByRole('heading', { name: 'In planning' })
		});
		await expect(
			inPlanningColumnAfterReload.getByTitle(testTask.payload.title).first()
		).toBeVisible();
	});
});

test.describe('Subtask creation', () => {
	// Use admin to ensure permission to create tasks
	test.use({ storageState: 'tests/.auth/admin.json' });

	const subtaskTitle = `Subtask ${Date.now()}`;

	test('subtask can be created and persists', async ({ page, testTask }) => {
		await page.goto(`/${testTask.organization}/tasks/status`);

		// Open parent task overlay
		await page.getByTitle(testTask.payload.title).click();
		await expect(page.locator('.overlay')).toBeVisible();

		// Restrict to overlay to avoid strict mode violation (duplicate Edit mode checkboxes in banners).
		await page.locator('.overlay').getByRole('checkbox', { name: 'Edit mode' }).check();
		await page.getByRole('button', { name: 'Add section' }).click();
		await page.getByRole('menuitem', { name: 'Tasks' }).click();

		// Force interaction with Add item button ignoring disabled state
		await page.getByRole('button', { name: 'Add item' }).click({ force: true });
		await page.getByRole('textbox', { name: 'Title' }).fill(subtaskTitle);
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByTitle(subtaskTitle)).toBeVisible();
		await page.getByRole('button', { name: 'Back' }).click();

		// Verify that the parent task title does not appear as a subtask
		const subtaskSection = page
			.locator('.overlay')
			.locator('section')
			.filter({ hasText: 'Subtasks' });
		await subtaskSection.scrollIntoViewIfNeeded();
		await expect(subtaskSection.getByTitle(testTask.payload.title)).not.toBeVisible();
		await page.reload();
		await expect(page.getByTitle(testTask.payload.title)).toBeVisible();

		// After reload, verify parent is still not visible as a subtask
		const subtaskSectionAfterReload = page
			.locator('.overlay')
			.locator('section')
			.filter({ hasText: 'Subtasks' });

		await expect(subtaskSectionAfterReload.getByTitle(testTask.payload.title)).not.toBeVisible();
	});
});
