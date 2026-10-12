import {
	type Container,
	containerOfType,
	payloadTypes,
	predicates,
	type TextPayload
} from '$lib/models';
import { createContainer, deleteContainer, expect, test } from './fixtures';

test.use({ suiteId: 'programs' });

test.describe('Level board', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('create goals', async ({ dotsBoard, isMobile, testProgram, testProgramGoalTemplate }) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');
		void testProgramGoalTemplate;

		await dotsBoard.goto(`/${testProgram.organization}`);

		await dotsBoard.card(testProgram.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Assert the program is managed by the expected team
		await dotsBoard.overlay.disclosePropertiesButton.click();
		await expect(dotsBoard.overlay.locator.locator(':has-text("Managed by") + .value')).toHaveText(
			`Team ${testProgram.payload.title}`
		);

		// Switch to the levels board
		await dotsBoard.overlay.locator.getByRole('button', { name: 'Page' }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Level board' }).click();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Goals' })).toBeVisible();

		for (const item of ['Goal']) {
			const title = `${item} for ${testProgram.payload.title}`;

			// Create a new item
			const column = dotsBoard.overlay.locator.locator('section', { hasText: item });
			await column.getByRole('button', { name: 'Add item' }).first().click();
			await dotsBoard.page
				.getByRole('dialog')
				.getByRole('article')
				.filter({ hasText: testProgramGoalTemplate.payload.title })
				.click();
			await dotsBoard.page.getByRole('textbox', { name: 'Title' }).fill(title);
			dotsBoard.page.waitForResponse(
				(response) =>
					new URL(response.url()).pathname === '/container/copy' &&
					response.request().method() === 'POST'
			);
			await dotsBoard.page.getByRole('button', { name: 'Save' }).click();

			// Verify the created item is part of the program and managed by the same team
			await expect(dotsBoard.overlay.title).toHaveText(title, { timeout: 15000 });
			await dotsBoard.overlay.disclosePropertiesButton.click();
			await expect(dotsBoard.overlay.locator.getByLabel('Program', { exact: true })).toHaveText(
				testProgram.payload.title
			);
			await expect(
				dotsBoard.overlay.locator.locator(':has-text("Managed by") + .value')
			).toHaveText(`Team ${testProgram.payload.title}`);

			// Delete the item
			await dotsBoard.overlay.disclosePropertiesButton.click();
			await dotsBoard.overlay.delete();
		}
	});
});

test.describe('Program detail view', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('offers adding a chapter only in edit mode', async ({
		adminContext,
		dotsBoard,
		testProgram,
		testProgramGoalTemplate
	}, workerInfo) => {
		void testProgramGoalTemplate;

		const newText = containerOfType(payloadTypes.enum.text, testProgram) as Container<TextPayload>;
		const chapter = await createContainer(adminContext, {
			...newText,
			payload: { ...newText.payload, title: `Chapter of program ${workerInfo.workerIndex}` },
			relation: [
				{
					object: testProgram.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				}
			]
		});

		try {
			await dotsBoard.goto(`/${testProgram.organization}`);
			await dotsBoard.card(testProgram.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
			await expect(
				dotsBoard.overlay.locator.getByRole('heading', { name: chapter.payload.title })
			).toBeVisible();

			const addChapterButton = dotsBoard.overlay.locator.getByRole('button', {
				name: 'Chapter',
				exact: true
			});

			await expect(addChapterButton).toHaveCount(0);

			await dotsBoard.overlay.editModeToggle.check();
			await expect(addChapterButton).toBeVisible();
		} finally {
			await deleteContainer(adminContext, chapter);
		}
	});
});
