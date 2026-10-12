import { createContainer, deleteContainer, expect, test } from './fixtures';
import {
	type CategoryPayload,
	type Container,
	containerOfType,
	etag,
	type KnowledgePayload,
	type NewContainer,
	payloadTypes,
	predicates,
	type TermPayload
} from '$lib/models';

test.use({ suiteId: 'categories' });

test.describe('Categories', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('shows four default categories', async ({ defaultOrganization, page }) => {
		await page.goto(`/${defaultOrganization.guid}/categories`);

		const rootColumn = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { level: 2, name: 'Categories' }) });

		const defaultCategories = rootColumn
			.getByRole('article')
			.filter({ hasNotText: /^E2E Category/ });

		await expect(defaultCategories).toHaveCount(4);
	});

	test('a category with terms and subterms can be created through the UI', async ({
		categoriesBoard,
		testOrganization
	}) => {
		const { page, overlay } = categoriesBoard;

		const categoryTitle = 'Köppen climate classification';
		const termNames = ['Tropical', 'Arid'];
		const subtermNames = [
			['Tropical rainforest', 'Tropical monsoon'],
			['Hot desert', 'Cold desert']
		];

		async function createTerm(title: string, isFirst: boolean) {
			if (isFirst) {
				await overlay.locator.getByRole('button', { name: 'Create term' }).first().click();
			} else {
				const lastTerm = overlay.locator
					.locator('li')
					.filter({ has: page.getByRole('heading', { level: 2 }) })
					.last();
				await lastTerm.hover();
				await lastTerm.getByRole('button', { name: 'Create term' }).click();
			}

			const form = overlay.locator.locator('form').filter({ has: page.getByPlaceholder('Title') });
			await form.getByPlaceholder('Title').fill(title);

			const relationSaved = page.waitForResponse(
				(response) =>
					/\/container\/[^/]+\/relation$/.test(response.url()) &&
					response.request().method() === 'POST'
			);
			await form.locator('button[type="submit"]', { hasText: 'Create term' }).click();
			await relationSaved;

			await expect(overlay.locator.getByRole('heading', { level: 2, name: title })).toBeVisible();
		}

		// Create the category via the workspace "Add item" dialog
		await categoriesBoard.goto(`/${testOrganization.guid}`);
		await categoriesBoard.column('Categories').addItemButton.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('textbox', { name: 'Title' }).fill(categoryTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();

		await expect(overlay.title).toHaveText(categoryTitle);

		// Switch to edit mode so terms can be added.
		await overlay.editModeToggle.check();

		// Add two terms to the category
		await createTerm(termNames[0], true);
		await createTerm(termNames[1], false);

		// Add two subterms to each term
		for (const [index, termName] of termNames.entries()) {
			await overlay.locator.getByRole('link', { name: termName }).click();
			await expect(overlay.title).toHaveText(termName);

			// Edit mode is a global application state, so it persists here.
			await createTerm(subtermNames[index][0], true);
			await createTerm(subtermNames[index][1], false);

			await overlay.backButton.click();
			await expect(overlay.title).toHaveText(categoryTitle);
		}

		await overlay.closeButton.click();
		await expect(overlay.locator).not.toBeVisible();

		// Verify the created hierarchy shows up in the workspace
		await categoriesBoard.goto(`/${testOrganization.guid}`);

		await expect(categoriesBoard.column('Categories').card(categoryTitle)).toBeVisible();
		for (const termName of termNames) {
			await expect(categoriesBoard.column('Terms').card(termName)).toBeVisible();
		}
		for (const subtermName of subtermNames.flat()) {
			await expect(categoriesBoard.column('Sub-terms').card(subtermName)).toBeVisible();
		}

		// Selecting a card filters the related containers by hierarchy
		await categoriesBoard
			.column('Terms')
			.card(termNames[0])
			.getByRole('button', { name: 'Show relations' })
			.click();

		// Only the selected term, its category and its descendants remain visible.
		await expect(categoriesBoard.column('Categories').card(categoryTitle)).toBeVisible();
		await expect(categoriesBoard.column('Terms').card(termNames[0])).toBeVisible();
		await expect(categoriesBoard.column('Terms').card(termNames[1])).not.toBeVisible();

		for (const subtermName of subtermNames[0]) {
			await expect(categoriesBoard.column('Sub-terms').card(subtermName)).toBeVisible();
		}

		for (const subtermName of subtermNames[1]) {
			await expect(categoriesBoard.column('Sub-terms').card(subtermName)).not.toBeVisible();
		}
	});

	test('custom categories can be used as filter', async ({ goalsBoard, testGoal }) => {
		const openSharedCategoryFilter = async () => {
			const termCheckbox = goalsBoard.page.getByRole('checkbox', { name: 'Keine Armut' });
			if (await termCheckbox.isVisible()) {
				return;
			}

			const categoryButton = goalsBoard.page.getByRole('button', { name: 'SDG' });
			if (!(await categoryButton.isVisible())) {
				await goalsBoard.page.getByRole('button', { name: 'Filter' }).click();
			}
			if (!(await termCheckbox.isVisible())) {
				await categoryButton.click();
			}
		};

		await goalsBoard.goto(`/${testGoal.organization}`);
		await expect(goalsBoard.card(testGoal.payload.title)).toBeVisible();
		await goalsBoard.card(testGoal.payload.title).click();
		await expect(goalsBoard.overlay.title).toHaveText(testGoal.payload.title);

		await goalsBoard.overlay.editModeToggle.check();
		await goalsBoard.overlay.disclosePropertiesButton.click();
		await goalsBoard.overlay.locator.getByLabel('SDG').click();
		const saveResponse = goalsBoard.page.waitForResponse((r) => r.url().includes('/revision'));
		await goalsBoard.overlay.locator.getByRole('checkbox', { name: 'Keine Armut' }).check();
		await saveResponse;
		await goalsBoard.overlay.closeButton.click();
		await expect(goalsBoard.overlay.locator).not.toBeVisible();

		await goalsBoard.page.reload();
		await expect(goalsBoard.card(testGoal.payload.title)).toBeVisible();

		await openSharedCategoryFilter();
		await goalsBoard.page.getByRole('checkbox', { name: 'Kein Hunger' }).check();
		await expect(goalsBoard.card(testGoal.payload.title)).not.toBeVisible();

		await openSharedCategoryFilter();
		await goalsBoard.page.getByRole('checkbox', { name: 'Keine Armut' }).check();
		await expect(goalsBoard.card(testGoal.payload.title)).toBeVisible();
	});

	test('properties open when a term is also a sub-term of another term', async ({
		adminContext,
		page,
		testOrganization
	}) => {
		const suffix = test.info().project.name;
		const key = `twice-assigned-${suffix}`;
		const created: Container[] = [];

		const newCategory = containerOfType(
			payloadTypes.enum.category,
			testOrganization
		) as Container<CategoryPayload>;
		const category = await createContainer(adminContext, {
			...newCategory,
			payload: { ...newCategory.payload, key, title: `Twice assigned ${suffix}` }
		});
		created.unshift(category);

		async function createTerm(title: string, relation: NewContainer['relation']) {
			const newTerm = containerOfType(
				payloadTypes.enum.term,
				testOrganization
			) as Container<TermPayload>;
			const term = await createContainer(adminContext, {
				...newTerm,
				payload: { ...newTerm.payload, title, value: title.toLowerCase() },
				relation
			});
			created.unshift(term);
			return term;
		}

		const partOfCategory = (position: number) => ({
			object: category.guid,
			position,
			predicate: predicates.enum['is-part-of-category']
		});

		// Beta is a term of the category and a sub-term of Alpha at the same time.
		const alpha = await createTerm('Alpha', [partOfCategory(0)]);
		await createTerm('Beta', [
			partOfCategory(1),
			{ object: alpha.guid, position: 0, predicate: predicates.enum['is-part-of'] }
		]);
		await createTerm('Gamma', [partOfCategory(2)]);

		const newKnowledge = containerOfType(
			payloadTypes.enum.knowledge,
			testOrganization
		) as Container<KnowledgePayload>;
		const knowledge = await createContainer(adminContext, {
			...newKnowledge,
			payload: {
				...newKnowledge.payload,
				category: { [key]: ['alpha', 'beta', 'gamma'] },
				title: `Knowledge with twice assigned term ${suffix}`
			}
		});
		created.unshift(knowledge);

		const organization = await (
			await adminContext.request.get(`/container/${testOrganization.guid}`)
		).json();
		const previousConfiguration = organization.payload.propertiesConfiguration;

		async function configureProperties(propertiesConfiguration: unknown) {
			const current = await (
				await adminContext.request.get(`/container/${testOrganization.guid}`)
			).json();
			const response = await adminContext.request.post(
				`/container/${testOrganization.guid}/revision`,
				{
					data: { ...current, payload: { ...current.payload, propertiesConfiguration } },
					headers: { 'Content-Type': 'application/json', 'If-Match': etag(current) }
				}
			);
			expect(response.ok()).toBeTruthy();
		}

		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));

		try {
			await configureProperties({
				...previousConfiguration,
				knowledge: { headerAndPanel: ['type'], onlyPanel: [`category.${key}`], unused: [] }
			});

			await page.goto(`/${testOrganization.guid}/knowledge/catalog#view=${knowledge.guid}`);

			const overlay = page.locator('.overlay');
			await expect(overlay.getByRole('heading', { level: 1 })).toHaveText(knowledge.payload.title);
			await overlay.getByRole('button', { name: 'Show all properties' }).click();

			await expect(overlay.getByRole('heading', { level: 2, name: 'Properties' })).toBeVisible();
			const value = overlay.getByText(category.payload.title).locator('+ *');
			await expect(value.getByText('Alpha')).toBeVisible();
			await expect(value.getByText('Beta')).toHaveCount(1);
			await expect(value.getByText('Gamma')).toBeVisible();
			expect(errors).toEqual([]);
		} finally {
			await configureProperties(previousConfiguration);
			for (const container of created) {
				await deleteContainer(adminContext, container);
			}
		}
	});
});
