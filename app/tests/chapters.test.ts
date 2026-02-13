import { expect, test } from './fixtures';

test.describe('Chapters', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('chapter and text headings follow chapter structure', async ({
		dotsBoard,
		isMobile,
		testReport
	}) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		await dotsBoard.goto(`/${testReport.organization}`);
		await dotsBoard.card(testReport.payload.title).click();
		await expect(dotsBoard.overlay.title).toHaveText(testReport.payload.title);
		await dotsBoard.overlay.editModeToggle.check();

		// Helper to add a Chapter section and set its number
		async function addChapter(number: string) {
			const section = await dotsBoard.overlay.addSection('Chapter');
			await section.getByRole('textbox', { name: 'Title' }).fill(`Chapter ${number}`);
			await section.getByRole('textbox', { name: 'Chapter number' }).fill(number);
		}

		// Helper to add a Text section and set its heading
		async function addText(heading: string) {
			const section = await dotsBoard.overlay.addSection('Text');
			await section.getByRole('heading').fill(heading);
		}

		await dotsBoard.overlay.editModeToggle.check();

		// Build the requested structure:
		// 1, [Text], 1.1, [Text], 2, [Text], 2.1, [Text], 2.1.1, [Text]
		await addChapter('1');
		await addText('Text after 1');
		await addChapter('1.1');
		await addText('Text after 1.1');
		await addChapter('2');
		await addText('Text after 2');
		await addChapter('2.1');
		await addText('Text after 2.1');
		await addChapter('2.1.1');
		await addText('Text after 2.1.1');

		// Collect the heading tag names in the same order as the section list
		const headings = dotsBoard.overlay.locator.locator('ul li section .details-heading');
		const count = await headings.count();

		// We expect 10 headings (5 chapters + 5 text sections)
		expect(count).toBe(10);

		const tagNames = await Promise.all(
			Array.from({ length: count }, async (_, i) =>
				headings.nth(i).evaluate((el) => el.tagName.toLowerCase())
			)
		);

		// Expected tags by structure:
		// 1 -> h2
		// text after 1 -> h3
		// 1.1 -> h3
		// text after 1.1 -> h4
		// 2 -> h2
		// text after 2 -> h3
		// 2.1 -> h3
		// text after 2.1 -> h4
		// 2.1.1 -> h4
		// text after 2.1.1 -> h5
		expect(tagNames).toEqual(['h2', 'h3', 'h3', 'h4', 'h2', 'h3', 'h3', 'h4', 'h4', 'h5']);
	});
});
