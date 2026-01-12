import { expect, test } from '@playwright/test';

// This test verifies that chapter and text section heading levels follow
// the chapter numbering structure.

test.describe('Chapter section heading levels', () => {
	// Use admin to ensure we have permission to create and edit
	test.use({ storageState: 'tests/.auth/admin.json' });

	const title = `Report ${crypto.randomUUID()}`;

	test.beforeEach('add report', async ({ page, isMobile }) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		await page.goto('/');

		// Ensure feature flag is enabled
		await page.getByRole('navigation').getByText('AA').click();
		await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
		await page.getByLabel('Report').check();
		await page.getByRole('button', { name: 'Save' }).click();

		// Activate edit mode
		await page.getByLabel('edit mode').check();

		// Navigate to Dots board
		await page.getByText('dots', { exact: true }).click();

		// Add a report
		await page.getByLabel('Add item').first().click();
		await page.getByRole('menuitem', { name: 'Report' }).click();

		// Fill out a minimal form and save
		await page.getByRole('textbox', { name: 'Title' }).fill(title);
		await page.getByRole('button', { name: 'Save' }).click();
	});

	test.afterEach('delete goal', async ({ page, isMobile }) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		// Delete the goal
		await page.getByRole('button', { name: 'Delete' }).click();
		await page.getByRole('button', { name: `I want to delete "${title}"` }).click();

		await expect(page.getByTitle(title)).not.toBeAttached();
	});

	test('chapter and text headings follow chapter structure', async ({ page, isMobile }) => {
		test.skip(isMobile, 'Feature cannot be enabled on mobile');

		const overlay = page.locator('.overlay');

		// Helper to add a Chapter section and set its number
		async function addChapter(number: string) {
			const numberOfSections = await overlay.locator('.sections section').count();

			if (numberOfSections === 0) {
				await overlay.getByRole('button', { name: 'Add section' }).click();
				await overlay.getByRole('menuitem', { name: 'Chapter' }).click();
			} else {
				const lastSection = overlay.locator('.sections section').nth(numberOfSections - 1);
				await lastSection.hover();
				await lastSection.getByRole('button', { name: 'Add section' }).click({ force: true });
				await lastSection.getByRole('menuitem', { name: 'Chapter' }).click({ force: true });
			}

			const section = overlay.locator('.sections section').nth(numberOfSections);
			const chapterTitle = section.getByRole('textbox', { name: 'Title' });
			await chapterTitle.fill(`Chapter ${number}`, { force: true });
			const numberInput = section.getByRole('textbox', { name: 'Chapter number' });
			await numberInput.fill(number, { force: true });
		}

		async function addCustomCollection(headingText: string) {
			const numberOfSections = await overlay.locator('.sections section').count();
			const lastSection = overlay.locator('.sections section').nth(numberOfSections - 1);
			await lastSection.hover();
			await lastSection.getByRole('button', { name: 'Add section' }).click({ force: true });
			await lastSection.getByRole('menuitem', { name: 'Custom collection' }).click({ force: true });

			const section = overlay.locator('.sections section').nth(numberOfSections);
			await section.getByRole('textbox', { name: 'Title' }).fill(headingText, { force: true });
		}

		// Build the requested structure:
		// 1, [Text], 1.1, [Text], 2, [Text], 2.1, [Text], 2.1.1, [Text]
		await addChapter('1');
		await addCustomCollection('Text after 1');
		await addChapter('1.1');
		await addCustomCollection('Text after 1.1');
		await addChapter('2');
		await addCustomCollection('Text after 2');
		await addChapter('2.1');
		await addCustomCollection('Text after 2.1');
		await addChapter('2.1.1');
		await addCustomCollection('Text after 2.1.1');

		// Collect the heading tag names in the same order as the section list
		const headings = overlay.locator('ul li section .details-heading');
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
