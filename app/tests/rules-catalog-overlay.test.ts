import { createContainer, deleteContainer, expect, test } from './fixtures';
import {
	type Container,
	containerOfType,
	type GoalPayload,
	payloadTypes,
	type RulePayload
} from '$lib/models';

test.use({ suiteId: 'rules-catalog-overlay' });
test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Rules catalog overlay', () => {
	test('opens and lists rules', async ({ adminContext, dotsBoard, isMobile, testGoal }) => {
		const suffix = test.info().project.name;
		const makeRule = (title: string) => {
			const template = containerOfType(
				payloadTypes.enum.rule,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as Container<RulePayload>;
			return createContainer(adminContext, {
				...template,
				payload: { ...template.payload, title }
			}) as Promise<Container<RulePayload>>;
		};

		const ruleA = await makeRule(`E2E Rule Alpha ${suffix}`);
		const ruleB = await makeRule(`E2E Rule Beta ${suffix}`);

		try {
			await dotsBoard.page.goto(`/${testGoal.organization}/all/level`);
			await dotsBoard.contextTabs.open('Rules', isMobile);

			await expect(dotsBoard.contextTabs.current.getByTitle(ruleA.payload.title)).toBeVisible();
			await expect(dotsBoard.contextTabs.current.getByTitle(ruleB.payload.title)).toBeVisible();

			await dotsBoard.contextTabs.close();
			await expect(dotsBoard.contextTabs.current).not.toBeVisible();
		} finally {
			await deleteContainer(adminContext, ruleA);
			await deleteContainer(adminContext, ruleB);
		}
	});

	test('sorts rules by number of matching category terms', async ({
		adminContext,
		dotsBoard,
		isMobile,
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
			) as Container<RulePayload>;
			return createContainer(adminContext, {
				...template,
				payload: {
					...template.payload,
					title,
					category: termValues.length ? { [categoryKey]: termValues } : {}
				}
			}) as Promise<Container<RulePayload>>;
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

			await dotsBoard.page.goto(`/${testGoal.organization}/all/level?${params}`);
			await dotsBoard.contextTabs.open('Rules', isMobile);

			await expect(
				dotsBoard.contextTabs.current.getByTitle(ruleDoubleMatch.payload.title)
			).toBeVisible();
			await expect(
				dotsBoard.contextTabs.current.getByTitle(ruleSingleMatch.payload.title)
			).toBeVisible();

			const articles = await dotsBoard.contextTabs.current.getByRole('article').all();
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
		isMobile,
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
		) as Container<GoalPayload>;
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
		) as Container<RulePayload>;
		const ruleMatch = (await createContainer(adminContext, {
			...matchTemplate,
			payload: {
				...matchTemplate.payload,
				title: matchTitle,
				category: { [categoryKey]: [termAValue] }
			}
		})) as Container<RulePayload>;

		const noMatchTemplate = containerOfType(
			payloadTypes.enum.rule,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as Container<RulePayload>;
		const ruleNoMatch = (await createContainer(adminContext, {
			...noMatchTemplate,
			payload: { ...noMatchTemplate.payload, title: noMatchTitle }
		})) as Container<RulePayload>;

		try {
			await dotsBoard.goto(`/${testGoal.organization}`);
			await dotsBoard.card(goalWithCategory.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(goalWithCategory.payload.title);
			await dotsBoard.overlay.contextTabs.open('Rules', isMobile);

			await expect(dotsBoard.overlay.contextTabs.current.getByTitle(matchTitle)).toBeVisible();
			await expect(dotsBoard.overlay.contextTabs.current.getByTitle(noMatchTitle)).toBeVisible();

			const articles = await dotsBoard.overlay.contextTabs.current.getByRole('article').all();
			const cardTitles = await Promise.all(articles.map((a) => a.getAttribute('title')));
			expect(cardTitles.indexOf(matchTitle)).toBeLessThan(cardTitles.indexOf(noMatchTitle));
		} finally {
			await deleteContainer(adminContext, ruleMatch);
			await deleteContainer(adminContext, ruleNoMatch);
			await deleteContainer(adminContext, goalWithCategory);
		}
	});
});
