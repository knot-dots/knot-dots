import { expect, test } from './fixtures';

test.use({ suiteId: 'templates-overlay' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test.describe('Templates overlay', () => {
	test.skip(({ isMobile }) => isMobile, 'Workspace menu is not visible on mobile');

	test('shows templates and returns from a template detail', async ({
		dotsBoard,
		reportTemplate,
		testProgram
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Templates' }).click();

		expect(dotsBoard.page.url()).toContain(`templates=${testProgram.guid}`);
		await expect(dotsBoard.overlay.locator.getByTitle(reportTemplate.payload.title)).toBeVisible();

		await dotsBoard.overlay.locator.getByTitle(reportTemplate.payload.title).click();
		await expect(dotsBoard.overlay.backButton).toBeVisible();
		await dotsBoard.overlay.backButton.click();

		await expect(dotsBoard.overlay.locator.getByTitle(reportTemplate.payload.title)).toBeVisible();
	});

	test('switches between overlay and fullscreen', async ({
		dotsBoard,
		reportTemplate,
		testProgram
	}) => {
		await dotsBoard.goto(`/${testProgram.organization}`);
		await dotsBoard.card(testProgram.payload.title).click();

		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Templates' }).click();
		await dotsBoard.overlay.fullScreenButton.click();

		await expect(dotsBoard.overlay.locator.first()).not.toBeVisible();
		expect(dotsBoard.page.url()).toContain('/templates/catalog');
		expect(dotsBoard.page.url()).toContain(testProgram.guid);
		await expect(dotsBoard.page.getByTitle(reportTemplate.payload.title)).toBeVisible();

		await dotsBoard.page.getByRole('link', { name: 'Back to overlay' }).first().click();
		await expect(dotsBoard.overlay.locator).toBeVisible();
		await expect(dotsBoard.overlay.locator.getByTitle(reportTemplate.payload.title)).toBeVisible();
	});
});
