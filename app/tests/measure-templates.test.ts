import { expect, test, deleteContainer } from './fixtures';
import MeasurePage from './measure-page';

test.use({ suiteId: 'measure-templates', storageState: 'tests/.auth/orgadmin.json' });

test('measure templates support overlay and fullscreen navigation and exclude program templates', async ({
	dotsBoard,
	testMeasure,
	measureGoalTemplate,
	programReportTemplate,
	isMobile
}) => {
	test.skip(isMobile, 'Workspace menu is not visible on mobile');
	await dotsBoard.goto(`/${testMeasure.organization}`);
	await dotsBoard.card(testMeasure.payload.title).click();
	await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
	await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Templates', exact: true }).click();
	expect(dotsBoard.page.url()).toContain(`templates=${testMeasure.guid}`);
	await expect(async () => {
		await dotsBoard.page.reload();
		await expect(
			dotsBoard.overlay.locator.getByTitle(measureGoalTemplate.payload.title, { exact: true })
		).toBeVisible();
	}).toPass({ timeout: 20000 });
	await expect(
		dotsBoard.overlay.locator.getByTitle(programReportTemplate.payload.title, { exact: true })
	).not.toBeVisible();
	await dotsBoard.overlay.fullScreenButton.click();
	await expect(dotsBoard.page).toHaveURL(new RegExp(`/${testMeasure.guid}/templates/catalog`));
	await expect(
		dotsBoard.page.getByRole('main').getByTitle(measureGoalTemplate.payload.title, { exact: true })
	).toBeVisible();
	await dotsBoard.page.getByRole('link', { name: 'Back to overlay' }).first().click();
	await expect(
		dotsBoard.overlay.locator.getByTitle(measureGoalTemplate.payload.title, { exact: true })
	).toBeVisible();
});

test('measure creation requires its own template and preserves program management', async ({
	dotsBoard,
	adminContext,
	testMeasure,
	measureGoalTemplate,
	measureGoalCollection,
	testProgramGoalTemplate
}) => {
	void measureGoalCollection;
	const measurePage = new MeasurePage(dotsBoard.page);
	await measurePage.goto(testMeasure);
	const dialog = await measurePage.createGoal();
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
	await expect(dialog.getByText('Without template', { exact: true })).toHaveCount(0);
	await expect(
		dialog.getByRole('article').filter({ hasText: testProgramGoalTemplate.payload.title })
	).toHaveCount(0);
	await dialog.getByRole('article').filter({ hasText: measureGoalTemplate.payload.title }).click();
	await dialog
		.getByRole('textbox', { name: 'Title', exact: true })
		.fill('Instantiated measure goal');
	const saved = dotsBoard.page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container/copy' &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	const response = await saved;
	expect(response.status()).toBe(201);
	const instance = await response.json();
	try {
		expect(instance.payload.template).toBe(false);
		expect(instance.relation).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ object: testMeasure.guid, predicate: 'is-part-of-measure' })
			])
		);
		expect(instance.managed_by).toEqual(testMeasure.managed_by);
		await expect(dialog).not.toBeVisible();
		await expect(async () => {
			await dotsBoard.page.reload();
			await expect(
				measurePage.goals.getByTitle('Instantiated measure goal', { exact: true })
			).toBeVisible();
		}).toPass({ timeout: 20000 });
	} finally {
		await deleteContainer(adminContext, instance);
	}
});

test('measure with no scoped templates hides goal creation', async ({
	dotsBoard,
	testMeasure,
	measureGoalCollection
}) => {
	void measureGoalCollection;
	const measurePage = new MeasurePage(dotsBoard.page);
	await measurePage.goto(testMeasure);
	await expect(measurePage.goals).toBeVisible();
	await expect(measurePage.addGoalButton).toHaveCount(0);
});

test('simple measures use their scoped templates for creation', async ({
	dotsBoard,
	testSimpleMeasure,
	simpleMeasureGoalCollection,
	simpleMeasureGoalTemplate
}) => {
	void simpleMeasureGoalCollection;
	const measurePage = new MeasurePage(dotsBoard.page);
	await measurePage.goto(testSimpleMeasure);
	const dialog = await measurePage.createGoal();
	await expect(
		dialog.getByRole('article').filter({ hasText: simpleMeasureGoalTemplate.payload.title })
	).toBeVisible();
	await expect(dialog.getByText('Without template', { exact: true })).toHaveCount(0);
});
