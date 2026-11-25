import type { AnyPayload, Container } from '$lib/models';
import { deleteContainer, expect, test } from './fixtures';
import GoalPage from './goal-page';
import { chooseKind, confirm, findSuggestion } from './objective-or-effect-dialog';

test.use({ suiteId: 'objectives' });

// Containers created through the dialog, deleted after each test.
let created: Container<AnyPayload>[] = [];

test.afterEach(async ({ adminContext }) => {
	for (const container of created) {
		await deleteContainer(adminContext, container);
	}
	created = [];
});

test.describe('Creating objectives', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('an objective for a suggested indicator stays when the goal is saved', async ({
		dotsBoard,
		goalObjectiveCollection,
		testGoal,
		testIndicator
	}) => {
		void goalObjectiveCollection;
		const goalPage = new GoalPage(dotsBoard.page);
		await goalPage.goto(testGoal);

		const dialog = await goalPage.createObjective();
		await expect(
			dialog.getByRole('heading', {
				name: 'Choose an existing indicator for the objective or create a new one'
			})
		).toBeVisible();
		const suggestion = await findSuggestion(dialog, testIndicator.payload.title);
		await suggestion.getByText(testIndicator.payload.title).click();

		await expect(
			dialog.getByRole('heading', { name: 'Create a new objective with an existing indicator' })
		).toBeVisible();
		await dialog.getByRole('textbox', { name: 'Description' }).fill('Half of all trips by bike.');
		await chooseKind(dialog, 'Tendency');
		await dialog.getByText('An increasing trend is desired', { exact: true }).click();

		const { item } = await confirm(dotsBoard.page, dialog, { newIndicator: false }, created);
		expect(item.payload).toMatchObject({ title: testIndicator.payload.title, trendValue: 1 });
		expect(item.relation).toContainEqual(
			expect.objectContaining({ object: testIndicator.guid, predicate: 'is-objective-for' })
		);
		await expect(goalPage.objectives.getByTitle(testIndicator.payload.title)).toBeVisible();

		// Saving the goal sends its relations along, which must include the new objective.
		const savePromise = dotsBoard.page.waitForResponse(
			(response) =>
				response.url().endsWith(`/container/${testGoal.guid}/revision`) &&
				response.request().method() === 'POST'
		);
		await dotsBoard.page.getByRole('main').getByRole('heading', { level: 1 }).fill('Edited goal');
		expect((await savePromise).ok()).toBe(true);

		await dotsBoard.page.reload();
		await expect(goalPage.objectives.getByTitle(testIndicator.payload.title)).toBeVisible();
	});

	test('wanted values are entered next to the actual data of the indicator', async ({
		dotsBoard,
		goalObjectiveCollection,
		testGoal,
		testIndicatorActualData
	}) => {
		void goalObjectiveCollection;
		const title = testIndicatorActualData.payload.title;
		const goalPage = new GoalPage(dotsBoard.page);
		await goalPage.goto(testGoal);

		const dialog = await goalPage.createObjective();
		const suggestion = await findSuggestion(dialog, title);
		await suggestion.getByText(title).click();
		await chooseKind(dialog, 'Number values');

		// The actual data ends in 2025.
		const year = new Date().getFullYear();
		await dialog.getByRole('spinbutton', { name: `Wanted values ${year}` }).fill('-2');
		for (let y = year; y > 2025; y--) {
			await dialog.getByRole('button', { name: 'Add year' }).first().click();
		}
		await expect(
			dialog.getByRole('columnheader', { name: 'Historical and extrapolated values' })
		).toBeVisible();
		await expect(
			dialog
				.getByRole('row')
				.filter({ has: dotsBoard.page.getByRole('rowheader', { name: '2025', exact: true }) })
		).toContainText('12');

		const { item } = await confirm(dotsBoard.page, dialog, { newIndicator: false }, created);
		expect(item.payload).toMatchObject({ type: 'objective' });
		expect(item.payload).toHaveProperty('wantedValues', expect.arrayContaining([[year, -2]]));
		expect(item.payload).not.toHaveProperty('achievedValues');
		expect(item.payload).not.toHaveProperty('description');

		// The chart needs the indicator, which the card has before a reload too.
		await expect(
			goalPage.objectives.getByRole('article').filter({ hasText: title }).getByRole('figure')
		).toBeVisible();
	});

	test('an objective of kind Yes/No can be created with a new indicator', async ({
		dotsBoard,
		goalObjectiveCollection,
		testGoal
	}, testInfo) => {
		void goalObjectiveCollection;
		const title = `New indicator ${testInfo.workerIndex} objective`;
		const goalPage = new GoalPage(dotsBoard.page);
		await goalPage.goto(testGoal);

		const dialog = await goalPage.createObjective();
		await dialog.getByRole('button', { name: 'Create objective with new indicator' }).click();
		await expect(
			dialog.getByRole('heading', { name: 'Create a new objective', exact: true })
		).toBeVisible();

		await chooseKind(dialog, 'Yes/No');
		await dialog.getByRole('textbox', { name: 'Title of the objective' }).fill(title);
		await expect(dialog.getByRole('checkbox', { name: 'Specify yes or no' })).toBeChecked();

		const { indicator, item } = await confirm(
			dotsBoard.page,
			dialog,
			{ newIndicator: true },
			created
		);
		expect(indicator?.payload).toMatchObject({ title, type: 'binary_indicator' });
		expect(item.payload).toMatchObject({ booleanValue: true, title, type: 'objective' });
		await expect(goalPage.objectives.getByTitle(title)).toBeVisible();
	});
});
