import type { Locator, Page } from '@playwright/test';
import type { AnyPayload, Container } from '$lib/models';
import { deleteContainer, expect, test } from './fixtures';
import MeasurePage from './measure-page';

test.use({ suiteId: 'effects' });

// Containers created through the dialog, deleted after each test.
let created: Container<AnyPayload>[] = [];

test.afterEach(async ({ adminContext }) => {
	for (const container of created) {
		await deleteContainer(adminContext, container);
	}
	created = [];
});

// Other indicators may fill the first page of suggestions.
async function findSuggestion(dialog: Locator, title: string) {
	await dialog.getByRole('searchbox', { name: 'Search' }).fill(title);
	return dialog.getByRole('article').filter({ hasText: title });
}

async function confirm(page: Page, dialog: Locator, { newIndicator }: { newIndicator: boolean }) {
	const responsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container/bulk-action/create' &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
	const response = await responsePromise;

	// A new indicator is created before the effect measured by it. Whatever was
	// created is deleted after the test, even if an assertion fails.
	const containers: Container<AnyPayload>[] = response.ok() ? await response.json() : [];
	created.push(...containers);
	expect(response.status()).toBe(201);
	expect(containers).toHaveLength(newIndicator ? 2 : 1);
	await expect(dialog).toBeHidden();

	return { effect: containers.at(-1)!, indicator: newIndicator ? containers[0] : undefined };
}

test.describe('Creating effects', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('an effect measured by a suggested indicator stays when the measure is saved', async ({
		dotsBoard,
		measureEffectCollection,
		testIndicator,
		testMeasure
	}) => {
		void measureEffectCollection;
		const measurePage = new MeasurePage(dotsBoard.page);
		await measurePage.goto(testMeasure);

		const dialog = await measurePage.createEffect();
		const suggestion = await findSuggestion(dialog, testIndicator.payload.title);
		await expect(suggestion).toContainText(/Relevance\s*\d\.\d/);
		await suggestion.getByText(testIndicator.payload.title).click();

		await expect(dialog.getByRole('navigation')).toContainText('Define effect');
		await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();

		await dialog.getByRole('textbox', { name: 'Description' }).fill('More people cycle.');
		await dialog.getByRole('button', { name: 'Type of effect' }).click();
		await dialog.getByRole('radio', { name: 'Tendency', exact: true }).click();
		await dialog
			.getByText('This tends to have an increasing effect on the indicator', { exact: true })
			.click();
		await expect(
			dialog.getByRole('radio', {
				name: 'This tends to have an increasing effect on the indicator'
			})
		).toBeChecked();

		await confirm(dotsBoard.page, dialog, { newIndicator: false });
		await expect(measurePage.effects.getByTitle(testIndicator.payload.title)).toBeVisible();

		// Saving the measure sends its relations along, which must include the new effect.
		const savePromise = dotsBoard.page.waitForResponse(
			(response) =>
				response.url().endsWith(`/container/${testMeasure.guid}/revision`) &&
				response.request().method() === 'POST'
		);
		await dotsBoard.page
			.getByRole('main')
			.getByRole('heading', { level: 1 })
			.fill('Edited measure');
		expect((await savePromise).ok()).toBe(true);

		await dotsBoard.page.reload();
		await expect(measurePage.effects.getByTitle(testIndicator.payload.title)).toBeVisible();
	});

	test('a suggested indicator shows its actual data, also once chosen', async ({
		dotsBoard,
		measureEffectCollection,
		testIndicatorActualData,
		testMeasure
	}) => {
		void measureEffectCollection;
		const measurePage = new MeasurePage(dotsBoard.page);
		await measurePage.goto(testMeasure);

		const dialog = await measurePage.createEffect();
		const suggestion = await findSuggestion(dialog, testIndicatorActualData.payload.title);
		await expect(suggestion.getByRole('figure')).toBeVisible();

		// The chosen indicator is shown next to the definition of the effect.
		await suggestion.getByText(testIndicatorActualData.payload.title).click();
		await expect(dialog.getByRole('textbox', { name: 'Description' })).toBeVisible();
		const chosen = dialog
			.getByRole('article')
			.filter({ hasText: testIndicatorActualData.payload.title });
		await expect(chosen.getByRole('figure')).toBeVisible();
		await expect(chosen).toContainText(/Relevance\s*\d\.\d/);
	});

	[
		{
			kind: 'Tendency',
			fillValue: async (dialog: Locator) => {
				await dialog.getByRole('button', { name: 'Unit' }).click();
				await dialog.getByRole('radio', { name: 'km', exact: true }).click();
				await dialog
					.getByText('This tends to have a decreasing effect on the indicator', { exact: true })
					.click();
				await expect(
					dialog.getByRole('radio', {
						name: 'This tends to have a decreasing effect on the indicator'
					})
				).toBeChecked();
			}
		},
		{
			kind: 'Number series/value',
			fillValue: async (dialog: Locator) => {
				await dialog.getByRole('button', { name: 'Unit' }).click();
				await dialog.getByRole('radio', { name: 'km', exact: true }).click();
				await dialog.getByRole('spinbutton', { name: 'Planned values' }).fill('25');
			}
		},
		{
			kind: 'Yes/No',
			fillValue: async () => {}
		}
	].forEach(({ kind, fillValue }) => {
		test(`an effect of kind ${kind} can be created with a new indicator`, async ({
			dotsBoard,
			measureEffectCollection,
			testMeasure
		}, testInfo) => {
			void measureEffectCollection;
			const title = `New indicator ${testInfo.workerIndex} ${kind}`;
			const measurePage = new MeasurePage(dotsBoard.page);
			await measurePage.goto(testMeasure);

			const dialog = await measurePage.createEffect();
			await dialog.getByRole('button', { name: 'Create new effect' }).click();

			await dialog.getByRole('textbox', { name: 'Description' }).fill('Something changes.');
			await dialog.getByRole('button', { name: 'Type of effect' }).click();
			await dialog.getByRole('radio', { name: kind, exact: true }).click();
			await dialog.getByRole('textbox', { name: 'Title' }).fill(title);
			await fillValue(dialog);

			const { indicator } = await confirm(dotsBoard.page, dialog, { newIndicator: true });
			expect(indicator?.payload).toMatchObject({ title });
			await expect(measurePage.effects.getByTitle(title)).toBeVisible();
		});
	});

	test('an effect with planned values for a suggested indicator shows its chart', async ({
		dotsBoard,
		measureEffectCollection,
		testIndicator,
		testMeasure
	}) => {
		void measureEffectCollection;
		const measurePage = new MeasurePage(dotsBoard.page);
		await measurePage.goto(testMeasure);

		const dialog = await measurePage.createEffect();
		const suggestion = await findSuggestion(dialog, testIndicator.payload.title);
		await suggestion.getByText(testIndicator.payload.title).click();
		await dialog.getByRole('textbox', { name: 'Description' }).fill('More people cycle.');
		await dialog.getByRole('button', { name: 'Type of effect' }).click();
		await dialog.getByRole('radio', { name: 'Number series/value', exact: true }).click();
		await dialog.getByRole('spinbutton', { name: 'Planned values' }).fill('25');
		await confirm(dotsBoard.page, dialog, { newIndicator: false });

		// The chart needs the indicator, which the card has before a reload too.
		await expect(
			measurePage.effects
				.getByRole('article')
				.filter({ hasText: testIndicator.payload.title })
				.getByRole('figure')
		).toBeVisible();
	});
});

test.describe('Creating effects without permission to create indicators', () => {
	// Bob heads the program the measure belongs to, but is only a member of the
	// organization, where new indicators are created.
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('only existing indicators can be chosen', async ({
		dotsBoard,
		measureEffectCollection,
		testIndicator,
		testMeasure
	}) => {
		void measureEffectCollection;
		const measurePage = new MeasurePage(dotsBoard.page);
		await measurePage.goto(testMeasure);

		const dialog = await measurePage.createEffect();
		await expect(await findSuggestion(dialog, testIndicator.payload.title)).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Create new effect' })).toHaveCount(0);
	});
});
