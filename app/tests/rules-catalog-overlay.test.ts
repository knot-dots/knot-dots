import { expect, test, createContainer, deleteContainer } from './fixtures';
import { containerOfType, type GoalContainer, payloadTypes, type RuleContainer } from '$lib/models';

test.use({ suiteId: 'rules-catalog-overlay' });
test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Rules catalog overlay', () => {
	test('opens and lists rules', async ({ adminContext, dotsBoard, testGoal }) => {
		const suffix = test.info().project.name;
		const makeRule = (title: string) => {
			const template = containerOfType(
				payloadTypes.enum.rule,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as RuleContainer;
			return createContainer(adminContext, {
				...template,
				payload: { ...template.payload, title }
			}) as Promise<RuleContainer>;
		};

		const ruleA = await makeRule(`E2E Rule Alpha ${suffix}`);
		const ruleB = await makeRule(`E2E Rule Beta ${suffix}`);

		try {
			await dotsBoard.page.goto(`/${testGoal.organization}/all/level#view-rules=`);

			await expect(dotsBoard.overlay.locator.getByTitle(ruleA.payload.title)).toBeVisible();
			await expect(dotsBoard.overlay.locator.getByTitle(ruleB.payload.title)).toBeVisible();

			await dotsBoard.overlay.closeButton.click();
			await expect(dotsBoard.overlay.locator).not.toBeVisible();
		} finally {
			await deleteContainer(adminContext, ruleA);
			await deleteContainer(adminContext, ruleB);
		}
	});

	test('sorts rules by number of matching category terms', async ({
		adminContext,
		dotsBoard,
		testGoal,
		testCategoryWithTerms
	}) => {
		const { category, terms } = testCategoryWithTerms;
		const categoryKey = category.payload.key as string;
		const suffix = test.info().project.name;

		const termAValue = terms[0].payload.value as string;
		const termBValue = terms[1].payload.value as string;

		const makeRule = (title: string, termValues: string[]) => {
			const template = containerOfType(
				payloadTypes.enum.rule,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as RuleContainer;
			return createContainer(adminContext, {
				...template,
				payload: {
					...template.payload,
					title,
					category: termValues.length ? { [categoryKey]: termValues } : {}
				}
			}) as Promise<RuleContainer>;
		};

		const ruleDoubleMatch = await makeRule(`E2E Rule Double Match ${suffix}`, [
			termAValue,
			termBValue
		]);
		const ruleSingleMatch = await makeRule(`E2E Rule Single Match ${suffix}`, [termAValue]);

		try {
			const params = new URLSearchParams([
				[categoryKey, termAValue],
				[categoryKey, termBValue]
			]);
			await dotsBoard.page.goto(`/${testGoal.organization}/all/level?${params}#view-rules=`);

			const doubleMatchCard = dotsBoard.overlay.locator.getByTitle(ruleDoubleMatch.payload.title);
			const singleMatchCard = dotsBoard.overlay.locator.getByTitle(ruleSingleMatch.payload.title);
			await expect(doubleMatchCard).toBeVisible();
			await expect(singleMatchCard).toBeVisible();

			const articles = await dotsBoard.overlay.locator.getByRole('article').all();
			const cardTitles = await Promise.all(articles.map((a) => a.getAttribute('title')));
			expect(cardTitles.indexOf(ruleDoubleMatch.payload.title)).toBeLessThan(
				cardTitles.indexOf(ruleSingleMatch.payload.title)
			);
		} finally {
			await deleteContainer(adminContext, ruleDoubleMatch);
			await deleteContainer(adminContext, ruleSingleMatch);
		}
	});

	test('uses categories of a container opened in view overlay', async ({
		adminContext,
		dotsBoard,
		testGoal,
		testCategoryWithTerms
	}) => {
		const { category, terms } = testCategoryWithTerms;
		const categoryKey = category.payload.key as string;
		const termAValue = terms[0].payload.value as string;
		const suffix = test.info().project.name;

		const noMatchTitle = `E2E Rule A No Match ${suffix}`;
		const matchTitle = `E2E Rule B With Category ${suffix}`;
		const goalTitle = `E2E Goal With Rule Category ${suffix}`;

		const goalTemplate = containerOfType(
			payloadTypes.enum.goal,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as GoalContainer;
		const goalWithCategory = await createContainer(adminContext, {
			...goalTemplate,
			payload: {
				...goalTemplate.payload,
				title: goalTitle,
				category: { [categoryKey]: [termAValue] }
			}
		});

		const matchTemplate = containerOfType(
			payloadTypes.enum.rule,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as RuleContainer;
		const ruleMatch = (await createContainer(adminContext, {
			...matchTemplate,
			payload: {
				...matchTemplate.payload,
				title: matchTitle,
				category: { [categoryKey]: [termAValue] }
			}
		})) as RuleContainer;

		const noMatchTemplate = containerOfType(
			payloadTypes.enum.rule,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as RuleContainer;
		const ruleNoMatch = (await createContainer(adminContext, {
			...noMatchTemplate,
			payload: { ...noMatchTemplate.payload, title: noMatchTitle }
		})) as RuleContainer;

		try {
			await dotsBoard.goto(`/${testGoal.organization}`);
			await dotsBoard.card(goalWithCategory.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(goalWithCategory.payload.title);

			const urlWithoutHash = dotsBoard.page.url().split('#')[0];
			await dotsBoard.page.goto(`${urlWithoutHash}#view-rules=`);

			const matchCard = dotsBoard.overlay.locator.getByTitle(matchTitle);
			const noMatchCard = dotsBoard.overlay.locator.getByTitle(noMatchTitle);
			await expect(matchCard).toBeVisible();
			await expect(noMatchCard).toBeVisible();

			const articles = await dotsBoard.overlay.locator.getByRole('article').all();
			const cardTitles = await Promise.all(articles.map((a) => a.getAttribute('title')));
			expect(cardTitles.indexOf(matchTitle)).toBeLessThan(cardTitles.indexOf(noMatchTitle));
		} finally {
			await deleteContainer(adminContext, ruleMatch);
			await deleteContainer(adminContext, ruleNoMatch);
			await deleteContainer(adminContext, goalWithCategory);
		}
	});
});
