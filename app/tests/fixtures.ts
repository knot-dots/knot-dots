import { type BrowserContext, test as base } from '@playwright/test';
import { locale } from 'svelte-i18n';
import {
	type AnyContainer,
	containerOfType,
	etag,
	type GoalContainer,
	type MeasureContainer,
	type NewContainer,
	type OrganizationalUnitContainer,
	type OrganizationContainer,
	payloadTypes,
	predicates,
	type ProgramContainer,
	type ReportContainer,
	type TaskCollectionContainer,
	type TaskContainer
} from '$lib/models';
import { DotsBoard, TaskStatusBoard } from './boards';

type MyFixtures = {
	dotsBoard: DotsBoard;
	taskStatusBoard: TaskStatusBoard;
};

type MyWorkerFixtures = {
	adminContext: BrowserContext;
	defaultOrganization: OrganizationContainer;
	testOrganization: OrganizationContainer;
	testOrganizationalUnit: OrganizationalUnitContainer;
	testProgram: ProgramContainer;
	testGoal: GoalContainer;
	testMeasure: MeasureContainer;
	testTask: TaskContainer;
	testTaskCollection: TaskCollectionContainer;
	testReport: ReportContainer;
};

locale.set('en');

async function createContainer(context: BrowserContext, newContainer: NewContainer) {
	const response = await context.request.post('/container', { data: newContainer });

	if (!response.ok()) {
		throw new Error(`Failed to create container: ${response.status()} ${response.statusText()}`);
	}

	return response.json();
}

async function deleteContainer(context: BrowserContext, container: AnyContainer) {
	const response = await context.request.get(`/container/${container.guid}`);

	// If container doesn't exist or request failed, skip deletion
	if (!response.ok()) {
		throw new Error(
			`Failed to fetch container for deletion: ${response.status()} ${response.statusText()}`
		);
	}

	const currentVersion = await response.json();
	await context.request.delete(`/container/${container.guid}`, {
		headers: { 'If-Match': etag(currentVersion) }
	});
}

async function inviteUser(context: BrowserContext, email: string, container: AnyContainer) {
	await context.request.post(`/user`, { data: { email, container } });
}

export const test = base.extend<MyFixtures, MyWorkerFixtures>({
	adminContext: [
		async ({ browser }, use, workerInfo) => {
			const adminContext = await browser.newContext({
				baseURL: workerInfo.project.use.baseURL,
				storageState: 'tests/.auth/admin.json'
			});

			await use(adminContext);
		},
		{ scope: 'worker' }
	],
	defaultOrganization: [
		async ({ adminContext }, use) => {
			const response = await adminContext.request.get('/', { maxRedirects: 0 });
			const guid = response.headers()['location'].split('/')[1];
			const organizationResponse = await adminContext.request.get(`/container/${guid}`);
			const defaultOrganization: OrganizationContainer = await organizationResponse.json();

			await use(defaultOrganization);
		},
		{ auto: true, scope: 'worker' }
	],
	dotsBoard: async ({ page }, use) => {
		await use(new DotsBoard(page));
	},
	taskStatusBoard: async ({ page }, use) => {
		await use(new TaskStatusBoard(page));
	},
	testOrganization: [
		async ({ adminContext, defaultOrganization }, use, workerInfo) => {
			const newOrganization = containerOfType(
				payloadTypes.enum.organization,
				defaultOrganization.guid,
				null,
				defaultOrganization.guid,
				'knot-dots'
			) as OrganizationContainer;
			const testOrganization = await createContainer(adminContext, {
				...newOrganization,
				payload: {
					...newOrganization.payload,
					name: `Test Organization ${workerInfo.workerIndex}`,
					boards: ['board.organizational_units']
				}
			});
			await inviteUser(adminContext, 'builderbob@bobby.com', testOrganization);

			await use(testOrganization);

			await deleteContainer(adminContext, testOrganization);
		},
		{ scope: 'worker' }
	],
	testOrganizationalUnit: [
		async ({ adminContext, testOrganization }, use, workerInfo) => {
			const newOrganizationalUnit = containerOfType(
				payloadTypes.enum.organizational_unit,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as OrganizationalUnitContainer;
			const testOrganizationalUnit = await createContainer(adminContext, {
				...newOrganizationalUnit,
				payload: {
					...newOrganizationalUnit.payload,
					name: `Test Organizational Unit ${workerInfo.workerIndex}`
				}
			});

			await use(testOrganizationalUnit);

			await deleteContainer(adminContext, testOrganizationalUnit);
		},
		{ scope: 'worker' }
	],
	testProgram: [
		async ({ adminContext, testOrganization }, use, workerInfo) => {
			const newProgram = containerOfType(
				payloadTypes.enum.program,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ProgramContainer;
			const testProgram = await createContainer(adminContext, {
				...newProgram,
				payload: { ...newProgram.payload, title: `Test Program ${workerInfo.workerIndex}` }
			});

			await use(testProgram);

			await deleteContainer(adminContext, testProgram);
		},
		{ scope: 'worker' }
	],
	testGoal: [
		async ({ adminContext, testOrganization }, use, workerInfo) => {
			const newGoal = containerOfType(
				payloadTypes.enum.goal,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as GoalContainer;
			const testGoal = await createContainer(adminContext, {
				...newGoal,
				payload: { ...newGoal.payload, title: `Test Goal ${workerInfo.workerIndex}` }
			});

			await use(testGoal);

			await deleteContainer(adminContext, testGoal);
		},
		{ scope: 'worker' }
	],
	testMeasure: [
		async ({ adminContext, testOrganization, testProgram }, use, workerInfo) => {
			const newMeasure = containerOfType(
				payloadTypes.enum.measure,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as MeasureContainer;
			const testMeasure = await createContainer(adminContext, {
				...newMeasure,
				payload: { ...newMeasure.payload, title: `Test Measure ${workerInfo.workerIndex}` },
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of-program'],
						object: testProgram.guid
					}
				]
			});

			await use(testMeasure);

			await deleteContainer(adminContext, testMeasure);
		},
		{ scope: 'worker' }
	],
	testTaskCollection: [
		async ({ adminContext, testGoal }, use) => {
			const newTaskCollection = containerOfType(
				payloadTypes.enum.task_collection,
				testGoal.organization,
				null,
				testGoal.managed_by,
				'knot-dots'
			) as TaskCollectionContainer;
			const testTaskCollection = await createContainer(adminContext, {
				...newTaskCollection,
				relation: [
					{ position: 0, predicate: predicates.enum['is-section-of'], object: testGoal.guid }
				]
			});

			await use(testTaskCollection);
		},
		{ scope: 'worker' }
	],
	testTask: [
		async ({ adminContext, testTaskCollection, testGoal }, use, workerInfo) => {
			const newTask = containerOfType(
				payloadTypes.enum.task,
				testTaskCollection.organization,
				null,
				testTaskCollection.managed_by,
				'knot-dots'
			) as TaskContainer;
			const testTask = await createContainer(adminContext, {
				...newTask,
				payload: {
					...newTask.payload,
					taskCategory: 'task_category.design',
					title: `Test Task ${workerInfo.workerIndex}`
				},
				relation: [{ position: 0, predicate: predicates.enum['is-part-of'], object: testGoal.guid }]
			});

			await use(testTask);

			await deleteContainer(adminContext, testTask);
		},
		{ scope: 'worker' }
	],
	testReport: [
		async ({ adminContext, testOrganization }, use, workerInfo) => {
			const newReport = containerOfType(
				payloadTypes.enum.report,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ReportContainer;
			const testReport = await createContainer(adminContext, {
				...newReport,
				payload: {
					...newReport.payload,
					title: `Test Report ${workerInfo.workerIndex}`
				}
			});

			await use(testReport);

			await deleteContainer(adminContext, testReport);
		},
		{ scope: 'worker' }
	]
});

export { expect } from '@playwright/test';
