import { type BrowserContext, test as base } from '@playwright/test';
import { locale } from 'svelte-i18n';
import {
	type AnyContainer,
	type CategoryContainer,
	containerOfType,
	type EffectContainer,
	etag,
	type GoalContainer,
	type IndicatorContainer,
	type IndicatorTemplateContainer,
	type MeasureContainer,
	type NewContainer,
	type ObjectiveContainer,
	type OrganizationalUnitContainer,
	type OrganizationContainer,
	payloadTypes,
	type Predicate,
	predicates,
	type ProgramContainer,
	quantities,
	type ReportContainer,
	type ResourceDataContainer,
	resourceDataTypes,
	type ResourceV2Container,
	type TaskCollectionContainer,
	type TaskContainer,
	type TermContainer
} from '$lib/models';
import { CategoriesBoard, DotsBoard, TaskStatusBoard } from './boards';
import { IndicatorCatalog, ResourceCatalog } from './catalogs';
import { LandingPage } from './pages';

type MyFixtures = {
	categoriesBoard: CategoriesBoard;
	dotsBoard: DotsBoard;
	indicatorCatalog: IndicatorCatalog;
	landingPage: LandingPage;
	resourceCatalog: ResourceCatalog;
	taskStatusBoard: TaskStatusBoard;
	testIndicatorTemplate: IndicatorTemplateContainer;
	testCategoryWithTerms: {
		category: CategoryContainer;
		terms: TermContainer[];
		termNames: string[];
	};
};

type MyWorkerFixtures = {
	suiteId: string;
	adminContext: BrowserContext;
	defaultOrganization: OrganizationContainer;
	testOrganization: OrganizationContainer;
	testOrganizationalUnit: OrganizationalUnitContainer;
	testProgram: ProgramContainer;
	testGoal: GoalContainer;
	testSubordinateGoal: GoalContainer;
	testIndicator: IndicatorContainer;
	testObjective: ObjectiveContainer;
	testMeasure: MeasureContainer;
	testSubordinateMeasure: MeasureContainer;
	testEffect: EffectContainer;
	testResourceV2: ResourceV2Container;
	testResourceDataBudget: ResourceDataContainer;
	testResourceDataPlanned: ResourceDataContainer;
	testResourceDataActual: ResourceDataContainer;
	testGoalBudget: ResourceDataContainer;
	testSubordinateGoalBudget: ResourceDataContainer;
	testSubordinateMeasureResourceData: ResourceDataContainer;
	testTask: TaskContainer;
	testTaskCollection: TaskCollectionContainer;
	testReport: ReportContainer;
};

locale.set('en');

async function createContainer(context: BrowserContext, newContainer: NewContainer) {
	const response = await context.request.post('/container', { data: newContainer });

	if (!response.ok()) {
		throw new Error(`Failed to create ${newContainer.payload.type}: ${await response.text()}`);
	}

	return response.json();
}

async function deleteContainer(context: BrowserContext, container: AnyContainer) {
	const response = await context.request.get(`/container/${container.guid}`);

	if (!response.ok()) {
		console.log(`Failed to fetch container ${container.guid} for deletion: ${response.status()}`);
		return;
	}

	const currentVersion = await response.json();
	await context.request.delete(`/container/${container.guid}`, {
		headers: { 'If-Match': etag(currentVersion) }
	});
}

async function inviteUser(
	context: BrowserContext,
	email: string,
	container: AnyContainer,
	role: Predicate[] = []
) {
	const inviteResponse = await context.request.post(`/user`, { data: { email, container } });
	if (role.length > 0) {
		await context.request.post(`/container/${container.guid}/user`, {
			data: role.map((r) => ({
				object: container.guid,
				predicate: r,
				subject: inviteResponse.headers()['location'].split('/').at(-1)
			}))
		});
	}
}

export const test = base.extend<MyFixtures, MyWorkerFixtures>({
	suiteId: ['not-specified', { scope: 'worker', option: true }],
	adminContext: [
		async ({ browser, suiteId }, use, workerInfo) => {
			void suiteId; // declares dependency to force a new worker per test file
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
	categoriesBoard: async ({ page }, use) => {
		await use(new CategoriesBoard(page));
	},
	dotsBoard: async ({ page }, use) => {
		await use(new DotsBoard(page));
	},
	indicatorCatalog: async ({ page }, use) => {
		await use(new IndicatorCatalog(page));
	},
	landingPage: async ({ page }, use) => {
		await use(new LandingPage(page));
	},
	resourceCatalog: async ({ page }, use) => {
		await use(new ResourceCatalog(page));
	},
	taskStatusBoard: async ({ page }, use) => {
		await use(new TaskStatusBoard(page));
	},
	testCategoryWithTerms: async ({ adminContext, testGoal }, use, workerInfo) => {
		const categoryTitle = `E2E Category ${workerInfo.project.name}`;
		const termNames = [
			`E2E Term A ${workerInfo.project.name}`,
			`E2E Term B ${workerInfo.project.name}`
		];

		const newCategory = containerOfType(
			payloadTypes.enum.category,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as NewContainer;
		(newCategory.payload as CategoryContainer['payload']).title = categoryTitle;

		const category = (await createContainer(adminContext, newCategory)) as CategoryContainer;

		const terms: TermContainer[] = [];
		for (const [index, termName] of termNames.entries()) {
			const newTerm = containerOfType(
				payloadTypes.enum.term,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as NewContainer;
			const termPayload = newTerm.payload as TermContainer['payload'];
			termPayload.title = termName;
			termPayload.value = termName.toLowerCase().replace(/\s+/g, '-');
			newTerm.relation = [
				{
					object: category.guid,
					position: index,
					predicate: predicates.enum['is-part-of-category']
				}
			];

			const term = (await createContainer(adminContext, newTerm)) as TermContainer;
			terms.push(term);
		}

		await use({ category, terms, termNames });

		await deleteContainer(adminContext, category);
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
					boards: ['board.indicators', 'board.organizational_units']
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
				payload: {
					...newProgram.payload,
					title: `Test Program ${workerInfo.workerIndex}`
				} as ProgramContainer['payload']
			});
			await inviteUser(adminContext, 'builderbob@bobby.com', testProgram, [
				predicates.enum['is-head-of'],
				predicates.enum['is-member-of']
			]);

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
				payload: {
					...(newGoal.payload as GoalContainer['payload']),
					title: `Test Goal ${workerInfo.workerIndex}`
				} as GoalContainer['payload']
			});

			await use(testGoal);

			await deleteContainer(adminContext, testGoal);
		},
		{ scope: 'worker' }
	],
	testSubordinateGoal: [
		async ({ adminContext, testOrganization, testGoal }, use, workerInfo) => {
			const newGoal = containerOfType(
				payloadTypes.enum.goal,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as GoalContainer;
			const testSubordinateGoal = await createContainer(adminContext, {
				...newGoal,
				payload: {
					...(newGoal.payload as GoalContainer['payload']),
					title: `Subordinate Goal ${workerInfo.workerIndex}`
				} as GoalContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testGoal.guid
					}
				]
			});

			await use(testSubordinateGoal);

			await deleteContainer(adminContext, testSubordinateGoal);
		},
		{ scope: 'worker' }
	],
	testIndicator: [
		async ({ adminContext, testOrganization }, use, workerInfo) => {
			const newIndicator = containerOfType(
				payloadTypes.enum.indicator,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as IndicatorContainer;
			const testIndicator = await createContainer(adminContext, {
				...newIndicator,
				payload: {
					...newIndicator.payload,
					title: `Test Indicator ${workerInfo.workerIndex}`,
					indicatorCategory: ['indicator_category.custom'],
					unit: 'unit.percent',
					quantity: quantities.enum['quantity.custom']
				} as IndicatorContainer['payload']
			});

			await use(testIndicator);

			await deleteContainer(adminContext, testIndicator);
		},
		{ scope: 'worker' }
	],
	testIndicatorTemplate: async ({ adminContext, testOrganization }, use, workerInfo) => {
		const newIndicatorTemplate = containerOfType(
			payloadTypes.enum.indicator_template,
			testOrganization.guid,
			null,
			testOrganization.guid,
			'knot-dots'
		) as IndicatorContainer;
		const testIndicatorTemplate = await createContainer(adminContext, {
			...newIndicatorTemplate,
			payload: {
				...newIndicatorTemplate.payload,
				title: `Test Indicator Template ${workerInfo.workerIndex}`,
				indicatorCategory: ['indicator_category.wegweiser_kommune'],
				unit: 'unit.km'
			} as IndicatorContainer['payload']
		});

		await use(testIndicatorTemplate);

		await deleteContainer(adminContext, testIndicatorTemplate);
	},
	testObjective: [
		async ({ adminContext, testOrganization, testGoal, testIndicator }, use, workerInfo) => {
			const newObjective = containerOfType(
				payloadTypes.enum.objective,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ObjectiveContainer;
			const testObjective = await createContainer(adminContext, {
				...newObjective,
				payload: {
					...newObjective.payload,
					title: `Test Objective ${workerInfo.workerIndex}`,
					iooiType: 'iooi.output'
				} as ObjectiveContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testGoal.guid
					},
					{
						position: 1,
						predicate: predicates.enum['is-objective-for'],
						object: testIndicator.guid
					}
				]
			});

			await use(testObjective);

			await deleteContainer(adminContext, testObjective);
		},
		{ scope: 'worker' }
	],
	testMeasure: [
		async ({ adminContext, testOrganization, testProgram }, use, workerInfo) => {
			const newMeasure = containerOfType(
				payloadTypes.enum.measure,
				testOrganization.guid,
				null,
				testProgram.guid,
				'knot-dots'
			) as MeasureContainer;
			const testMeasure = await createContainer(adminContext, {
				...newMeasure,
				payload: {
					...newMeasure.payload,
					title: `Test Measure ${workerInfo.workerIndex}`
				} as MeasureContainer['payload'],
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
	testSubordinateMeasure: [
		async (
			{ adminContext, testOrganization, testProgram, testSubordinateGoal },
			use,
			workerInfo
		) => {
			const newMeasure = containerOfType(
				payloadTypes.enum.measure,
				testOrganization.guid,
				null,
				testProgram.guid,
				'knot-dots'
			) as MeasureContainer;
			const testSubordinateMeasure = await createContainer(adminContext, {
				...newMeasure,
				payload: {
					...newMeasure.payload,
					title: `Subordinate Measure ${workerInfo.workerIndex}`
				} as MeasureContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testSubordinateGoal.guid
					},
					{
						position: 1,
						predicate: predicates.enum['is-part-of-program'],
						object: testProgram.guid
					}
				]
			});

			await use(testSubordinateMeasure);

			await deleteContainer(adminContext, testSubordinateMeasure);
		},
		{ scope: 'worker' }
	],
	testEffect: [
		async ({ adminContext, testOrganization, testMeasure, testIndicator }, use, workerInfo) => {
			const newEffect = containerOfType(
				payloadTypes.enum.effect,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as EffectContainer;
			const testEffect = await createContainer(adminContext, {
				...newEffect,
				payload: {
					...newEffect.payload,
					title: `Test Effect ${workerInfo.workerIndex}`,
					iooiType: 'iooi.output'
				} as EffectContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testMeasure.guid
					},
					{
						position: 1,
						predicate: predicates.enum['is-measured-by'],
						object: testIndicator.guid
					}
				]
			});

			await use(testEffect);

			await deleteContainer(adminContext, testEffect);
		},
		{ scope: 'worker' }
	],
	testResourceV2: [
		async ({ adminContext, testOrganization }, use, workerInfo) => {
			const newResourceV2 = containerOfType(
				payloadTypes.enum.resource_v2,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceV2Container;
			const testResourceV2 = await createContainer(adminContext, {
				...newResourceV2,
				payload: {
					...newResourceV2.payload,
					title: `Test Resource ${workerInfo.workerIndex}`,
					resourceCategory: 'resource_category.money',
					resourceUnit: 'unit.euro'
				} as ResourceV2Container['payload']
			});

			await use(testResourceV2);

			await deleteContainer(adminContext, testResourceV2);
		},
		{ scope: 'worker' }
	],
	testResourceDataBudget: [
		async ({ adminContext, testOrganization, testMeasure, testResourceV2 }, use, workerInfo) => {
			const newResourceData = containerOfType(
				payloadTypes.enum.resource_data,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceDataContainer;
			const testResourceDataBudget = await createContainer(adminContext, {
				...newResourceData,
				payload: {
					...newResourceData.payload,
					title: `Test Budget ${workerInfo.workerIndex}`,
					resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
					resource: testResourceV2.guid,
					entries: [
						{ year: 2025, amount: 10000 },
						{ year: 2026, amount: 15000 }
					]
				} as ResourceDataContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testMeasure.guid
					}
				]
			});

			await use(testResourceDataBudget);

			await deleteContainer(adminContext, testResourceDataBudget);
		},
		{ scope: 'worker' }
	],
	testResourceDataPlanned: [
		async ({ adminContext, testOrganization, testMeasure, testResourceV2 }, use, workerInfo) => {
			const newResourceData = containerOfType(
				payloadTypes.enum.resource_data,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceDataContainer;
			const testResourceDataPlanned = await createContainer(adminContext, {
				...newResourceData,
				payload: {
					...newResourceData.payload,
					title: `Test Planned ${workerInfo.workerIndex}`,
					resourceDataType:
						resourceDataTypes.enum['resource_data_type.planned_resource_allocation'],
					resource: testResourceV2.guid,
					entries: [
						{ year: 2025, amount: 8000 },
						{ year: 2026, amount: 12000 }
					]
				} as ResourceDataContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testMeasure.guid
					}
				]
			});

			await use(testResourceDataPlanned);

			await deleteContainer(adminContext, testResourceDataPlanned);
		},
		{ scope: 'worker' }
	],
	testResourceDataActual: [
		async ({ adminContext, testOrganization, testMeasure, testResourceV2 }, use, workerInfo) => {
			const newResourceData = containerOfType(
				payloadTypes.enum.resource_data,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceDataContainer;
			const testResourceDataActual = await createContainer(adminContext, {
				...newResourceData,
				payload: {
					...newResourceData.payload,
					title: `Test Actual ${workerInfo.workerIndex}`,
					resourceDataType: resourceDataTypes.enum['resource_data_type.actual_resource_allocation'],
					resource: testResourceV2.guid,
					entries: [
						{ year: 2025, amount: 7500 },
						{ year: 2026, amount: 11000 }
					]
				} as ResourceDataContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testMeasure.guid
					}
				]
			});

			await use(testResourceDataActual);

			await deleteContainer(adminContext, testResourceDataActual);
		},
		{ scope: 'worker' }
	],
	testGoalBudget: [
		async ({ adminContext, testOrganization, testGoal, testResourceV2 }, use, workerInfo) => {
			const newResourceData = containerOfType(
				payloadTypes.enum.resource_data,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceDataContainer;
			const testGoalBudget = await createContainer(adminContext, {
				...newResourceData,
				payload: {
					...newResourceData.payload,
					title: `Goal Budget ${workerInfo.workerIndex}`,
					resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
					resource: testResourceV2.guid,
					entries: [
						{ year: 2025, amount: 50000 },
						{ year: 2026, amount: 60000 }
					]
				} as ResourceDataContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testGoal.guid
					}
				]
			});

			await use(testGoalBudget);

			await deleteContainer(adminContext, testGoalBudget);
		},
		{ scope: 'worker' }
	],
	testSubordinateGoalBudget: [
		async (
			{ adminContext, testOrganization, testSubordinateGoal, testResourceV2 },
			use,
			workerInfo
		) => {
			const newResourceData = containerOfType(
				payloadTypes.enum.resource_data,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceDataContainer;
			const testSubordinateGoalBudget = await createContainer(adminContext, {
				...newResourceData,
				payload: {
					...newResourceData.payload,
					title: `Sub Goal Budget ${workerInfo.workerIndex}`,
					resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
					resource: testResourceV2.guid,
					entries: [
						{ year: 2025, amount: 20000 },
						{ year: 2026, amount: 25000 }
					]
				} as ResourceDataContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testSubordinateGoal.guid
					}
				]
			});

			await use(testSubordinateGoalBudget);

			await deleteContainer(adminContext, testSubordinateGoalBudget);
		},
		{ scope: 'worker' }
	],
	testSubordinateMeasureResourceData: [
		async (
			{ adminContext, testOrganization, testSubordinateMeasure, testResourceV2 },
			use,
			workerInfo
		) => {
			const newResourceData = containerOfType(
				payloadTypes.enum.resource_data,
				testOrganization.guid,
				null,
				testOrganization.guid,
				'knot-dots'
			) as ResourceDataContainer;
			const testSubordinateMeasureResourceData = await createContainer(adminContext, {
				...newResourceData,
				payload: {
					...newResourceData.payload,
					title: `Sub Measure Data ${workerInfo.workerIndex}`,
					resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
					resource: testResourceV2.guid,
					entries: [
						{ year: 2025, amount: 5000 },
						{ year: 2026, amount: 7000 }
					]
				} as ResourceDataContainer['payload'],
				relation: [
					{
						position: 0,
						predicate: predicates.enum['is-part-of'],
						object: testSubordinateMeasure.guid
					}
				]
			});

			await use(testSubordinateMeasureResourceData);

			await deleteContainer(adminContext, testSubordinateMeasureResourceData);
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
				} as ReportContainer['payload']
			});

			await use(testReport);

			await deleteContainer(adminContext, testReport);
		},
		{ scope: 'worker' }
	]
});

export { expect } from '@playwright/test';
