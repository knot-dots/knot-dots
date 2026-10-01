import { type Container, containerOfType, type GoalPayload, payloadTypes } from '$lib/models';
import { createContainer, deleteContainer, expect, test } from './fixtures';
import type { LandingPage } from './pages';

test.use({ suiteId: 'timeline' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

async function addTimeline(landingPage: LandingPage, { preview = false } = {}) {
	const section = await landingPage.addSection('Embed objects');
	const saveResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await section.getByPlaceholder('Enter title').fill('Chronicle');
	await saveResponse;

	await section.hover();
	const settingsDropdownButton = section.getByRole('button', { name: 'Settings' });
	await settingsDropdownButton.click();
	const settingsPanel = settingsDropdownButton.locator('//following-sibling::fieldset');
	await settingsPanel.getByRole('button', { name: 'View' }).click();
	const viewResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
	await settingsPanel.getByRole('radio', { name: 'Timeline' }).check();
	await viewResponse;
	if (preview) {
		const previewResponse = landingPage.page.waitForResponse((r) => r.url().includes('/revision'));
		await settingsPanel.getByRole('checkbox', { name: 'Show preview' }).check();
		await previewResponse;
	}
	await settingsPanel.getByRole('button', { name: 'Close' }).click();

	return section;
}

async function createGoals(
	adminContext: Parameters<typeof createContainer>[0],
	testOrganization: Parameters<typeof containerOfType>[1],
	goals: [string, string | undefined][]
) {
	const created: Container<GoalPayload>[] = [];
	for (const [title, fulfillmentDate] of goals) {
		const newGoal = containerOfType(
			payloadTypes.enum.goal,
			testOrganization
		) as Container<GoalPayload>;
		created.push(
			await createContainer(adminContext, {
				...newGoal,
				payload: { ...newGoal.payload, ...(fulfillmentDate ? { fulfillmentDate } : {}), title }
			})
		);
	}
	return created;
}

async function selectItems(
	landingPage: LandingPage,
	section: ReturnType<LandingPage['page']['locator']>,
	titles: string[]
) {
	await section.getByRole('button', { name: 'Add items', exact: true }).click();
	const dialog = landingPage.page.getByRole('dialog');
	await expect(dialog.getByText('Choose objects')).toBeVisible();
	for (const title of titles) {
		await dialog.getByRole('article').filter({ hasText: title }).click();
	}
	await dialog.getByRole('button', { name: `Apply (${titles.length})` }).click();
	await expect(dialog).not.toBeVisible();
}

test('Selected objects can be displayed in a timeline', async ({
	adminContext,
	landingPage,
	testOrganization
}, testInfo) => {
	const [goal, undatedGoal] = await createGoals(adminContext, testOrganization, [
		[`Timeline Goal ${testInfo.workerIndex}`, '2030-06-01'],
		[`Undated Goal ${testInfo.workerIndex}`, undefined]
	]);

	try {
		await landingPage.goto(`/${testOrganization.guid}`);
		await landingPage.header.editModeToggle.check();

		// Add "Embed objects" section and switch it to the timeline view
		const section = await addTimeline(landingPage);
		await selectItems(landingPage, section, [goal.payload.title, undatedGoal.payload.title]);

		// Assert the dated goal is shown and the undated one is reported
		const timeline = section.getByRole('region', { name: 'Chronicle' });
		const card = timeline.getByRole('link', { name: new RegExp(goal.payload.title) });
		await expect(card).toBeVisible();
		await expect(timeline.getByText(undatedGoal.payload.title)).toHaveCount(0);
		await expect(section.getByText('1 object without a date is not shown.')).toBeVisible();

		// Open the goal in the overlay
		await card.click();
		await expect(
			landingPage.overlay.locator.getByRole('heading', { name: goal.payload.title }).first()
		).toBeVisible();
	} finally {
		await deleteContainer(adminContext, goal);
		await deleteContainer(adminContext, undatedGoal);
	}
});

test('The preview keeps the selected object when it is opened', async ({
	adminContext,
	isMobile,
	landingPage,
	testOrganization
}, testInfo) => {
	const [first, second] = await createGoals(adminContext, testOrganization, [
		[`First Goal ${testInfo.workerIndex}`, '2030-06-01'],
		[`Second Goal ${testInfo.workerIndex}`, '2031-06-01']
	]);

	try {
		await landingPage.goto(`/${testOrganization.guid}`);
		await landingPage.header.editModeToggle.check();

		const section = await addTimeline(landingPage, { preview: true });
		await selectItems(landingPage, section, [first.payload.title, second.payload.title]);

		// Move on to the second goal with the keyboard
		const timeline = section.getByRole('region', { name: 'Chronicle' });
		const firstCard = timeline.getByRole('tab', { name: new RegExp(first.payload.title) });
		const secondCard = timeline.getByRole('tab', { name: new RegExp(second.payload.title) });
		await expect(firstCard).toHaveAttribute('aria-selected', 'true');
		await expect(timeline.getByRole('heading', { name: first.payload.title })).toBeVisible();
		await firstCard.focus();
		await firstCard.press('ArrowRight');
		await expect(secondCard).toHaveAttribute('aria-selected', 'true');
		await expect(timeline.getByRole('heading', { name: second.payload.title })).toBeVisible();

		// Open it in the overlay and assert the timeline stays on the second goal
		const detailsLink = timeline.getByRole('link', { name: 'Show details' });
		await (isMobile ? detailsLink.tap() : detailsLink.click());
		await expect(
			landingPage.overlay.locator.getByRole('heading', { name: second.payload.title }).first()
		).toBeVisible();
		await expect(secondCard).toHaveAttribute('aria-selected', 'true');
	} finally {
		await deleteContainer(adminContext, first);
		await deleteContainer(adminContext, second);
	}
});

for (const preview of [false, true]) {
	test(`The cards are navigated with the keyboard ${preview ? 'with' : 'without'} a preview`, async ({
		adminContext,
		landingPage,
		testOrganization
	}, testInfo) => {
		const goals = await createGoals(adminContext, testOrganization, [
			[`Goal A ${testInfo.workerIndex}`, '2030-06-01'],
			[`Goal B ${testInfo.workerIndex}`, '2031-06-01'],
			[`Goal C ${testInfo.workerIndex}`, '2032-06-01']
		]);

		try {
			await landingPage.goto(`/${testOrganization.guid}`);
			await landingPage.header.editModeToggle.check();

			const section = await addTimeline(landingPage, { preview });
			await selectItems(
				landingPage,
				section,
				goals.map(({ payload }) => payload.title)
			);

			// Cards are links without and tabs with a preview, but the keys are the same.
			const timeline = section.getByRole('region', { name: 'Chronicle' });
			const [a, b, c] = goals.map(({ payload }) =>
				timeline.getByRole(preview ? 'tab' : 'link', { name: new RegExp(payload.title) })
			);

			// The cards are a single tab stop
			await expect(a).toHaveAttribute('tabindex', '0');
			await expect(b).toHaveAttribute('tabindex', '-1');
			await expect(c).toHaveAttribute('tabindex', '-1');

			await a.focus();
			await a.press('ArrowRight');
			await expect(b).toBeFocused();
			await expect(b).toHaveAttribute('tabindex', '0');
			await b.press('End');
			await expect(c).toBeFocused();
			await c.press('Home');
			await expect(a).toBeFocused();
			await a.press('ArrowLeft');
			await expect(a).toBeFocused();

			// Enter opens the object in the overlay
			await a.press('ArrowRight');
			await b.press('Enter');
			await expect(
				landingPage.overlay.locator.getByRole('heading', { name: goals[1].payload.title }).first()
			).toBeVisible();
		} finally {
			for (const goal of goals) await deleteContainer(adminContext, goal);
		}
	});
}

test('The time axis can be zoomed in down to hours', async ({
	adminContext,
	landingPage,
	testOrganization
}, testInfo) => {
	const goals = await createGoals(adminContext, testOrganization, [
		[`Early Goal ${testInfo.workerIndex}`, '2030-06-01'],
		[`Late Goal ${testInfo.workerIndex}`, '2034-06-01']
	]);

	try {
		await landingPage.goto(`/${testOrganization.guid}`);
		await landingPage.header.editModeToggle.check();

		const section = await addTimeline(landingPage);
		await selectItems(
			landingPage,
			section,
			goals.map(({ payload }) => payload.title)
		);

		const timeline = section.getByRole('region', { name: 'Chronicle' });
		const zoomIn = timeline.getByRole('button', { name: 'Zoom in' });
		await expect(timeline.getByText('2032', { exact: true })).toBeVisible();
		await expect(timeline.getByRole('button', { name: 'Zoom out' })).toBeDisabled();

		while (await zoomIn.isEnabled()) {
			await zoomIn.click();
		}
		await expect(timeline.getByText(/^\d{2}:00$/).first()).toBeVisible();
	} finally {
		for (const goal of goals) await deleteContainer(adminContext, goal);
	}
});
