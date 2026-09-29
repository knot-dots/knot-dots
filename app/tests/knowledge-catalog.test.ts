import { createContainer, deleteContainer, expect, test } from './fixtures';
import {
	type Container,
	containerOfType,
	type GoalPayload,
	type KnowledgePayload,
	payloadTypes
} from '$lib/models';

test.use({ suiteId: 'knowledge-catalog' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test.describe('Knowledge catalog overlay', () => {
	test('opens and lists knowledge objects', async ({
		adminContext,
		dotsBoard,
		isMobile,
		testGoal
	}) => {
		const suffix = test.info().project.name;
		const makeKnowledge = (title: string) => {
			const template = containerOfType(
				payloadTypes.enum.knowledge,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as Container<KnowledgePayload>;
			return createContainer(adminContext, {
				...template,
				payload: { ...template.payload, title }
			}) as Promise<Container<KnowledgePayload>>;
		};

		const knowledgeA = await makeKnowledge(`E2E Knowledge Alpha ${suffix}`);
		const knowledgeB = await makeKnowledge(`E2E Knowledge Beta ${suffix}`);

		try {
			await dotsBoard.page.goto(`/${testGoal.organization}/all/level`);
			await dotsBoard.contextTabs.open('Knowledge', isMobile);

			await expect(
				dotsBoard.contextTabs.current.getByTitle(knowledgeA.payload.title)
			).toBeVisible();
			await expect(
				dotsBoard.contextTabs.current.getByTitle(knowledgeB.payload.title)
			).toBeVisible();

			await dotsBoard.contextTabs.close();
			await expect(dotsBoard.contextTabs.current).not.toBeVisible();
		} finally {
			await deleteContainer(adminContext, knowledgeA);
			await deleteContainer(adminContext, knowledgeB);
		}
	});

	test('sorts knowledge objects by number of matching category terms', async ({
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

		const makeKnowledge = (title: string, termValues: string[]) => {
			const template = containerOfType(
				payloadTypes.enum.knowledge,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as Container<KnowledgePayload>;
			return createContainer(adminContext, {
				...template,
				payload: {
					...template.payload,
					title,
					category: termValues.length ? { [categoryKey]: termValues } : {}
				}
			}) as Promise<Container<KnowledgePayload>>;
		};

		const knowledgeDoubleMatch = await makeKnowledge(`E2E Knowledge Double Match ${suffix}`, [
			termAValue,
			termBValue
		]);
		const knowledgeSingleMatch = await makeKnowledge(`E2E Knowledge Single Match ${suffix}`, [
			termAValue
		]);

		try {
			// Navigate directly with both category terms in the query string and the
			// knowledge overlay open via hash — avoids UI filter interaction entirely.
			const params = new URLSearchParams([
				[categoryKey, termAValue],
				[categoryKey, termBValue]
			]);
			await dotsBoard.page.goto(`/${testGoal.organization}/all/level?${params}`);
			await dotsBoard.contextTabs.open('Knowledge', isMobile);

			await expect(
				dotsBoard.contextTabs.current.getByTitle(knowledgeDoubleMatch.payload.title)
			).toBeVisible();
			await expect(
				dotsBoard.contextTabs.current.getByTitle(knowledgeSingleMatch.payload.title)
			).toBeVisible();

			// The container with two matching terms must appear before the one with one
			// in DOM order (visual layout may be multi-column, making y-comparison unreliable).
			const articles = await dotsBoard.contextTabs.current.getByRole('article').all();
			const cardTitles = await Promise.all(articles.map((a) => a.getAttribute('title')));
			expect(cardTitles.indexOf(knowledgeDoubleMatch.payload.title)).toBeLessThan(
				cardTitles.indexOf(knowledgeSingleMatch.payload.title)
			);
		} finally {
			await deleteContainer(adminContext, knowledgeDoubleMatch);
			await deleteContainer(adminContext, knowledgeSingleMatch);
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

		// Use a suffix to avoid title collisions with leftover data from crashed runs.
		const suffix = test.info().project.name;

		// Titles are chosen so that WITHOUT category-based sorting the non-matching
		// container would come first alphabetically ("A …" < "B …").  When the goal's
		// categories are applied as the active filter the matching container (score 1)
		// must be sorted above the non-matching one (score 0), flipping the order.
		const noMatchTitle = `E2E Knowledge A No Match ${suffix}`;
		const matchTitle = `E2E Knowledge B With Category ${suffix}`;
		const goalTitle = `E2E Goal With Category ${suffix}`;

		// Create a goal that has the first category term assigned
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

		// Knowledge container whose categories match the goal — alphabetically second
		const matchTemplate = containerOfType(
			payloadTypes.enum.knowledge,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as Container<KnowledgePayload>;
		const knowledgeMatch = (await createContainer(adminContext, {
			...matchTemplate,
			payload: {
				...matchTemplate.payload,
				title: matchTitle,
				category: { [categoryKey]: [termAValue] }
			}
		})) as Container<KnowledgePayload>;

		// Knowledge container with no categories — alphabetically first
		const noMatchTemplate = containerOfType(
			payloadTypes.enum.knowledge,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as Container<KnowledgePayload>;
		const knowledgeNoMatch = (await createContainer(adminContext, {
			...noMatchTemplate,
			payload: { ...noMatchTemplate.payload, title: noMatchTitle }
		})) as Container<KnowledgePayload>;

		try {
			// Open the goal in the view overlay so the store's view-knowledge handler
			// can read its categories from the current overlay container.
			await dotsBoard.goto(`/${testGoal.organization}`);
			await dotsBoard.card(goalWithCategory.payload.title).click();
			await expect(dotsBoard.overlay.title).toHaveText(goalWithCategory.payload.title);
			await dotsBoard.overlay.contextTabs.open('Knowledge', isMobile);

			await expect(dotsBoard.overlay.contextTabs.current.getByTitle(matchTitle)).toBeVisible();
			await expect(dotsBoard.overlay.contextTabs.current.getByTitle(noMatchTitle)).toBeVisible();

			// The matching container (score 1) must appear before the non-matching one
			// (score 0) in DOM order, even though alphabetically it would come second.
			const articles = await dotsBoard.overlay.contextTabs.current.getByRole('article').all();
			const cardTitles = await Promise.all(articles.map((a) => a.getAttribute('title')));
			expect(cardTitles.indexOf(matchTitle)).toBeLessThan(cardTitles.indexOf(noMatchTitle));
		} finally {
			await deleteContainer(adminContext, knowledgeMatch);
			await deleteContainer(adminContext, knowledgeNoMatch);
			await deleteContainer(adminContext, goalWithCategory);
		}
	});
});
