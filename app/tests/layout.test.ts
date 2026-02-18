import { expect, test } from './fixtures';

test('home screen has expected regions', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('banner')).toBeVisible();
	await expect(page.getByRole('main')).toBeVisible();
	await expect(page.getByRole('navigation')).toBeVisible();
});

test('navigation contains expected elements', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(page.getByRole('banner').getByRole('button', { name: 'Log in' })).toBeVisible();

	if (viewport && viewport.width >= 960) {
		await expect(
			page.getByRole('navigation').locator('header').getByRole('link', { name: 'knotdots.net' })
		).toBeVisible();
		await expect(
			page
				.getByRole('banner')
				.getByRole('button', { name: 'Organizations and organizational units' })
		).toBeVisible();
		await expect(page.getByRole('banner').getByRole('link', { name: 'dots' })).toBeVisible();
	}
});

test.describe(() => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('badge is not editable by Bob', async ({ dotsBoard, testGoal }) => {
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();

		await dotsBoard.overlay.editModeToggle.check();

		const badgeList = dotsBoard.overlay.locator.locator('ul.badges');
		const badgeButtons = badgeList.getByRole('button');

		if ((await badgeButtons.count()) > 0) {
			await expect(badgeButtons).not.toBeEditable();
		}
	});

	test('progress is not editable by Bob', async ({ dotsBoard, testGoal }) => {
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();

		await dotsBoard.overlay.editModeToggle.check();

		const slider = dotsBoard.overlay.locator.getByRole('slider', { name: 'Progress' });

		if ((await slider.count()) > 0) {
			await expect(slider).not.toBeEditable();
		}
	});

	test('task badge shows category', async ({ dotsBoard, testGoal, testTask }) => {
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.locator.getByText(testTask.payload.title).click();

		await dotsBoard.overlay.editModeToggle.check();

		// Get badges in heading and expect to have 'Design' badge
		const badges = dotsBoard.overlay.locator
			.locator('.details-section')
			.filter({ hasText: testTask.payload.title })
			.locator('.badges');
		await expect(badges).toHaveText(/Design/);
	});
});

const expectedHeadings = [
	'Title',
	'Description',
	'Visibility',
	'Status',
	'Category',
	'Topic',
	'Policy field (BNK 2.0)',
	'Audience',
	'Fulfillment date',
	'Editorial state',
	'Organizational unit',
	'Hierarchy level',
	'Goal type'
];

test.describe('Goals table columns', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('all goal columns are displayed', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/goals/table`);

		// Simpler: collect texts via all cells and compare arrays.
		const allHeaderCells = page.locator('.table-head .row .cell');
		await expect(allHeaderCells).toHaveCount(expectedHeadings.length + 1); // +1 for action column

		const received = await allHeaderCells.allTextContents();
		// Drop the first (action) empty cell
		received.shift();

		// Normalize whitespace
		const normalized = received.map((t) => t.trim());

		for (const heading of expectedHeadings) {
			expect(normalized).toContain(heading);
		}
		expect(normalized).toEqual(expectedHeadings);
	});
});

const expectedProgramHeadings = [
	'Title',
	'Description',
	'Visibility',
	'Status',
	'Category',
	'Topic',
	'Policy field (BNK 2.0)',
	'Audience',
	'Editorial state',
	'Organizational unit',
	'Program type'
];

test.describe('Programs table columns', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('all program columns are displayed', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/programs/table`);

		const allHeaderCells = page.locator('.table-head .row .cell');
		await expect(allHeaderCells).toHaveCount(expectedProgramHeadings.length + 1); // +1 for action column

		const received = await allHeaderCells.allTextContents();
		received.shift(); // remove action cell
		const normalized = received.map((t) => t.trim());

		for (const heading of expectedProgramHeadings) {
			expect(normalized).toContain(heading);
		}
		expect(normalized).toEqual(expectedProgramHeadings);
	});
});

const expectedMeasureHeadings = [
	'Title',
	'Description',
	'Visibility',
	'Status',
	'Category',
	'Topic',
	'Policy field (BNK 2.0)',
	'Audience',
	'Planned duration',
	'Editorial state',
	'Organizational unit',
	'Measure type'
];

test.describe('Measures table columns', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('all measure columns are displayed', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/measures/table`);

		const allHeaderCells = page.locator('.table-head .row .cell');
		await expect(allHeaderCells).toHaveCount(expectedMeasureHeadings.length + 1); // +1 for action column

		const received = await allHeaderCells.allTextContents();
		received.shift(); // remove action cell
		const normalized = received.map((t) => t.trim());

		for (const heading of expectedMeasureHeadings) {
			expect(normalized).toContain(heading);
		}
		expect(normalized).toEqual(expectedMeasureHeadings);
	});
});
