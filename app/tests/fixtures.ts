import { type BrowserContext, test as base } from '@playwright/test';
import { locale } from 'svelte-i18n';
import {
	type AnyPayload,
	type CategoryPayload,
	type Container,
	containerOfType,
	type EffectPayload,
	etag,
	type GoalPayload,
	type IndicatorPayload,
	type IndicatorTemplatePayload,
	type InitialCategoryPayload,
	type InitialResourceDataPayload,
	type InitialTermPayload,
	type MeasurePayload,
	type NewContainer,
	type ObjectivePayload,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	payloadTypes,
	type Predicate,
	predicates,
	type ProgramPayload,
	quantities,
	type ReportPayload,
	type ResourceDataPayload,
	resourceDataTypes,
	type ResourceV2Payload,
	type TaskCollectionPayload,
	type TaskPayload,
	type TermPayload
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
	testIndicatorTemplate: Container<IndicatorTemplatePayload>;
	testCategoryWithTerms: {
		category: Container<CategoryPayload>;
		terms: Array<Container<TermPayload>>;
		termNames: string[];
	};
};

type MyWorkerFixtures = {
	adminContext: BrowserContext;
	defaultOrganization: Container<OrganizationPayload>;
	testOrganization: Container<OrganizationPayload>;
	testOrganizationalUnit: Container<OrganizationalUnitPayload>;
	testProgram: Container<ProgramPayload>;
	testGoal: Container<GoalPayload>;
	testSubordinateGoal: Container<GoalPayload>;
	testIndicator: Container<IndicatorPayload>;
	testObjective: Container<ObjectivePayload>;
	testMeasure: Container<MeasurePayload>;
	testSubordinateMeasure: Container<MeasurePayload>;
	testEffect: Container<EffectPayload>;
	testResourceV2: Container<ResourceV2Payload>;
	testResourceDataBudget: Container<ResourceDataPayload>;
	testResourceDataPlanned: Container<ResourceDataPayload>;
	testResourceDataActual: Container<ResourceDataPayload>;
	testGoalBudget: Container<ResourceDataPayload>;
	testSubordinateGoalBudget: Container<ResourceDataPayload>;
	testSubordinateMeasureResourceData: Container<ResourceDataPayload>;
	testTask: Container<TaskPayload>;
	testTaskCollection: Container<TaskCollectionPayload>;
	testReport: Container<ReportPayload>;
};

locale.set('en');

async function createContainer(context: BrowserContext, newContainer: NewContainer) {
	const response = await context.request.post('/container', { data: newContainer });

	if (!response.ok()) {
		throw new Error(`Failed to create ${newContainer.payload.type}: ${await response.text()}`);
	}

	return response.json();
}

async function deleteContainer(context: BrowserContext, container: Container<AnyPayload>) {
	const response = await context.request.get(`/container/${container.guid}`);

	if (!response.ok()) {
		console.log(`Failed to fetch container for deletion: ${response.status()}`);
	}

	const currentVersion = await response.json();
	await context.request.delete(`/container/${container.guid}`, {
		headers: { 'If-Match': etag(currentVersion) }
	});
}

async function inviteUser(
	context: BrowserContext,
	email: string,
	container: Container<AnyPayload>,
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
			const defaultOrganization: Container<OrganizationPayload> = await organizationResponse.json();

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
		) as NewContainer<InitialCategoryPayload>;
		newCategory.payload.title = categoryTitle;

		const category = (await createContainer(
			adminContext,
			newCategory
		)) as Container<CategoryPayload>;

		const terms: Array<Container<TermPayload>> = [];
		for (const [index, termName] of termNames.entries()) {
			const newTerm = containerOfType(
				payloadTypes.enum.term,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as NewContainer<InitialTermPayload>;
			const termPayload = newTerm.payload;
			termPayload.title = termName;
			termPayload.value = termName.toLowerCase().replace(/\s+/g, '-');
			newTerm.relation = [
				{
					object: category.guid,
					position: index,
					predicate: predicates.enum['is-part-of-category']
				}
			];

			const term = (await createContainer(adminContext, newTerm)) as Container<TermPayload>;
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
			) as Container<OrganizationPayload>;
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
			) as Container<OrganizationalUnitPayload>;
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
			) as Container<ProgramPayload>;
			const testProgram = await createContainer(adminContext, {
				...newProgram,
				payload: {
					...newProgram.payload,
					title: `Test Program ${workerInfo.workerIndex}`
				}
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
			) as Container<GoalPayload>;
			const testGoal = await createContainer(adminContext, {
				...newGoal,
				payload: {
					...newGoal.payload,
					title: `Test Goal ${workerInfo.workerIndex}`
				}
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
			) as Container<GoalPayload>;
			const testSubordinateGoal = await createContainer(adminContext, {
				...newGoal,
				payload: {
					...newGoal.payload,
					title: `Subordinate Goal ${workerInfo.workerIndex}`
				},
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
			) as Container<IndicatorPayload>;
			const testIndicator = await createContainer(adminContext, {
				...newIndicator,
				payload: {
					...newIndicator.payload,
					title: `Test Indicator ${workerInfo.workerIndex}`,
					indicatorCategory: ['indicator_category.custom'],
					unit: 'unit.percent',
					quantity: quantities.enum['quantity.custom']
				}
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
		) as Container<IndicatorPayload>;
		const testIndicatorTemplate = await createContainer(adminContext, {
			...newIndicatorTemplate,
			payload: {
				...newIndicatorTemplate.payload,
				title: `Test Indicator Template ${workerInfo.workerIndex}`,
				indicatorCategory: ['indicator_category.wegweiser_kommune'],
				unit: 'unit.km'
			}
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
			) as Container<ObjectivePayload>;
			const testObjective = await createContainer(adminContext, {
				...newObjective,
				payload: {
					...newObjective.payload,
					title: `Test Objective ${workerInfo.workerIndex}`,
					iooiType: 'iooi.output'
				},
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
			) as Container<MeasurePayload>;
			const testMeasure = await createContainer(adminContext, {
				...newMeasure,
				payload: {
					...newMeasure.payload,
					title: `Test Measure ${workerInfo.workerIndex}`
				},
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
			) as Container<MeasurePayload>;
			const testSubordinateMeasure = await createContainer(adminContext, {
				...newMeasure,
				payload: {
					...newMeasure.payload,
					title: `Subordinate Measure ${workerInfo.workerIndex}`
				},
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
			) as Container<EffectPayload>;
			const testEffect = await createContainer(adminContext, {
				...newEffect,
				payload: {
					...newEffect.payload,
					title: `Test Effect ${workerInfo.workerIndex}`,
					iooiType: 'iooi.output'
				} as Container<EffectPayload>['payload'],
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
			) as Container<ResourceV2Payload>;
			const testResourceV2 = await createContainer(adminContext, {
				...newResourceV2,
				payload: {
					...newResourceV2.payload,
					title: `Test Resource ${workerInfo.workerIndex}`,
					resourceCategory: 'resource_category.money',
					resourceUnit: 'unit.euro'
				}
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
			) as Container<ResourceDataPayload>;
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
				},
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
			) as Container<ResourceDataPayload>;
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
				},
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
			) as Container<ResourceDataPayload>;
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
				},
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
			) as Container<ResourceDataPayload>;
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
				},
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
			) as Container<ResourceDataPayload>;
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
				},
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
			) as NewContainer<InitialResourceDataPayload>;
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
				},
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
			) as Container<TaskCollectionPayload>;
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
			) as Container<TaskPayload>;
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
			) as Container<ReportPayload>;
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
