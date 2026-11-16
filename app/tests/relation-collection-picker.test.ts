import {
	type Container,
	containerOfType,
	type GoalPayload,
	payloadTypes,
	predicates,
	type RelationCollectionPayload,
	type TaskPayload
} from '$lib/models';
import { createContainer, deleteContainer, expect, test } from './fixtures';

test.use({ suiteId: 'relation-collection-picker' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('an existing object is added to a relation section', async ({
	adminContext,
	dotsBoard,
	testGoal,
	testOrganization
}, workerInfo) => {
	const newSection = containerOfType(
		payloadTypes.enum.relation_collection,
		testGoal
	) as Container<RelationCollectionPayload>;
	const section = await createContainer(adminContext, {
		...newSection,
		payload: {
			...newSection.payload,
			payloadType: payloadTypes.enum.task,
			predicate: predicates.enum['is-part-of'],
			title: 'Tasks'
		},
		relation: [{ position: 0, predicate: predicates.enum['is-section-of'], object: testGoal.guid }]
	});

	const newTask = containerOfType(
		payloadTypes.enum.task,
		testOrganization
	) as Container<TaskPayload>;
	const existingTask = await createContainer(adminContext, {
		...newTask,
		payload: { ...newTask.payload, title: `Existing Task ${workerInfo.workerIndex}` }
	});

	const otherTask = await createContainer(adminContext, {
		...newTask,
		payload: { ...newTask.payload, title: `Other Task ${workerInfo.workerIndex}` }
	});

	// A goal may not be part of a goal through a section for tasks.
	const newGoal = containerOfType(
		payloadTypes.enum.goal,
		testOrganization
	) as Container<GoalPayload>;
	const otherGoal = await createContainer(adminContext, {
		...newGoal,
		payload: { ...newGoal.payload, title: `Other Goal ${workerInfo.workerIndex}` }
	});

	try {
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		const sectionLocator = dotsBoard.overlay.sections.filter({
			has: dotsBoard.page.getByRole('textbox', { name: 'Title' })
		});
		await sectionLocator.hover();
		await sectionLocator.getByRole('button', { name: 'Add existing objects' }).click();

		const dialog = dotsBoard.page.getByRole('dialog');
		await expect(dialog.getByText('Add existing objects')).toBeVisible();
		await expect(
			dialog.getByRole('article').filter({ hasText: existingTask.payload.title })
		).toBeVisible();
		await expect(
			dialog.getByRole('article').filter({ hasText: otherGoal.payload.title })
		).toHaveCount(0);
		await expect(
			dialog.getByRole('article').filter({ hasText: testGoal.payload.title })
		).toHaveCount(0);

		await dialog.getByRole('article').filter({ hasText: existingTask.payload.title }).click();
		await dialog.getByRole('button', { name: 'Apply (1)' }).click();
		await expect(dialog).not.toBeVisible();

		await expect(
			sectionLocator.getByRole('article').filter({ hasText: existingTask.payload.title })
		).toBeVisible();

		// The relation and the section's items are saved.
		const taskResponse = await adminContext.request.get(`/container/${existingTask.guid}`);
		expect((await taskResponse.json()).relation).toContainEqual(
			expect.objectContaining({
				object: testGoal.guid,
				predicate: predicates.enum['is-part-of'],
				subject: existingTask.guid
			})
		);
		const sectionResponse = await adminContext.request.get(`/container/${section.guid}`);
		expect((await sectionResponse.json()).payload.item).toEqual([existingTask.guid]);

		// Objects of the section are not offered again.
		await sectionLocator.hover();
		await sectionLocator.getByRole('button', { name: 'Add existing objects' }).click();
		await expect(
			dialog.getByRole('article').filter({ hasText: otherTask.payload.title })
		).toBeVisible();
		await expect(
			dialog.getByRole('article').filter({ hasText: existingTask.payload.title })
		).toHaveCount(0);
	} finally {
		await deleteContainer(adminContext, existingTask);
		await deleteContainer(adminContext, otherTask);
		await deleteContainer(adminContext, otherGoal);
	}
});

test('a relation the directory of allowed relations does not list is rejected', async ({
	adminContext,
	testGoal,
	testTask
}) => {
	// A task is part of a goal, not the other way around.
	const response = await adminContext.request.post(`/container/${testGoal.guid}/relation`, {
		data: [
			{
				object: testTask.guid,
				position: 0,
				predicate: predicates.enum['is-part-of'],
				subject: testGoal.guid
			}
		]
	});

	expect(response.status()).toBe(422);
});
