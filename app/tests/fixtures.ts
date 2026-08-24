import {
	type APIRequest,
	type APIRequestContext,
	type BrowserContext,
	test as base
} from '@playwright/test';
import { locale } from 'svelte-i18n';
import {
	type ActualDataPayload,
	type AnyPayload,
	type CategoryPayload,
	type Container,
	containerOfType,
	type EffectPayload,
	etag,
	type GoalPayload,
	type IndicatorTemplatePayload,
	type MeasurePayload,
	type NewContainer,
	type ObjectivePayload,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	payloadTypes,
	type Predicate,
	predicates,
	type ProgramPayload,
	programTypes,
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
import { LandingPage, ProgramPage } from './pages';
import { AllTable } from './tables';

type MyFixtures = {
	aiGoal: Container<GoalPayload>;
	allTable: AllTable;
	categoriesBoard: CategoriesBoard;
	dotsBoard: DotsBoard;
	indicatorCatalog: IndicatorCatalog;
	landingPage: LandingPage;
	organizationalUnitWithActualData: Container<OrganizationalUnitPayload>;
	programPage: ProgramPage;
	reportTemplate: Container<ReportPayload>;
	resourceCatalog: ResourceCatalog;
	taskStatusBoard: TaskStatusBoard;
	testCategoryWithTerms: {
		category: Container<CategoryPayload>;
		terms: Container<TermPayload>[];
		termNames: string[];
	};
	testEffect: Container<EffectPayload>;
	testGoal: Container<GoalPayload>;
	testGoalBudget: Container<ResourceDataPayload>;
	testIndicatorTemplate: Container<IndicatorTemplatePayload>;
	testIndividualProfile: Container<OrganizationalUnitPayload>;
	testMeasure: Container<MeasurePayload>;
	testObjective: Container<ObjectivePayload>;
	testOrganization: Container<OrganizationPayload>;
	testOrganizationalUnit: Container<OrganizationalUnitPayload>;
	testOrganizationalUnitGoal: Container<GoalPayload>;
	testProgram: Container<ProgramPayload>;
	testPublicProgram: Container<ProgramPayload>;
	testPublicReport: Container<ReportPayload>;
	testReport: Container<ReportPayload>;
	testResourceDataActual: Container<ResourceDataPayload>;
	testResourceDataBudget: Container<ResourceDataPayload>;
	testResourceDataPlanned: Container<ResourceDataPayload>;
	testResourceV2: Container<ResourceV2Payload>;
	testResourceV2Other: Container<ResourceV2Payload>;
	testSubordinateGoal: Container<GoalPayload>;
	testSubordinateGoalBudget: Container<ResourceDataPayload>;
	testSubordinateGoalBudgetOtherResource: Container<ResourceDataPayload>;
	testSubordinateMeasure: Container<MeasurePayload>;
	testSubordinateMeasureResourceData: Container<ResourceDataPayload>;
	testSubordinateMeasureResourceDataOtherResource: Container<ResourceDataPayload>;
	testTask: Container<TaskPayload>;
	testTaskCollection: Container<TaskCollectionPayload>;
};

type MyWorkerFixtures = {
	suiteId: string;
	adminContext: BrowserContext;
	defaultOrganization: Container<OrganizationPayload>;
};

locale.set('en');

const KC_URL = process.env.TEST_KC_URL ?? 'http://localhost:8080';
const KC_REALM = process.env.TEST_KC_REALM ?? 'knot-dots';
const KC_ADMIN_USER = process.env.TEST_KC_ADMIN_USER ?? 'admin';
const KC_ADMIN_PASSWORD = process.env.TEST_KC_ADMIN_PASSWORD ?? 'admin';

export interface KeycloakUser {
	email: string;
	firstName: string;
	lastName: string;
	password: string;
	realmRoles?: string[];
}

/**
 * Creates a confirmed Keycloak user via the admin API so it can be used to
 * authenticate in tests. Obtains an admin token, provisions the user and
 * assigns realm roles. Idempotent: an existing user with the same email is
 * updated to match the requested profile and password.
 */
export async function createUser(apiRequest: APIRequest, newUser: KeycloakUser) {
	// Obtain an admin token and build a pre-authenticated request context.
	const tokenContext = await apiRequest.newContext({ baseURL: KC_URL });
	let keycloakContext: APIRequestContext;
	try {
		const tokenResponse = await tokenContext.post('/realms/master/protocol/openid-connect/token', {
			form: {
				grant_type: 'password',
				client_id: 'admin-cli',
				username: KC_ADMIN_USER,
				password: KC_ADMIN_PASSWORD
			}
		});
		if (!tokenResponse.ok()) {
			throw new Error(
				`Failed to obtain Keycloak admin token. Keycloak responded with ${tokenResponse.status()}.`
			);
		}
		const { access_token } = (await tokenResponse.json()) as { access_token: string };
		keycloakContext = await apiRequest.newContext({
			baseURL: KC_URL,
			extraHTTPHeaders: { Authorization: `Bearer ${access_token}` }
		});
	} finally {
		await tokenContext.dispose();
	}

	try {
		const representation = {
			username: newUser.email,
			email: newUser.email,
			firstName: newUser.firstName,
			lastName: newUser.lastName,
			emailVerified: true,
			enabled: true,
			requiredActions: [],
			credentials: [{ type: 'password', value: newUser.password, temporary: false }]
		};

		const findUser = async () => {
			const response = await keycloakContext.get(`/admin/realms/${KC_REALM}/users`, {
				params: { email: newUser.email, exact: 'true' }
			});
			if (!response.ok()) {
				throw new Error(
					`Failed to look up Keycloak user ${newUser.email}. Keycloak responded with ${response.status()}.`
				);
			}
			return ((await response.json()) as Array<{ id: string }>)[0];
		};

		const createResponse = await keycloakContext.post(`/admin/realms/${KC_REALM}/users`, {
			data: representation
		});
		if (createResponse.status() !== 201 && createResponse.status() !== 409) {
			throw new Error(
				`Failed to create Keycloak user ${newUser.email}. Keycloak responded with ${createResponse.status()}: ${await createResponse.text()}`
			);
		}

		if (createResponse.status() === 409) {
			// User already exists: update it to match the requested profile and password.
			const existingUser = await findUser();
			if (!existingUser) {
				throw new Error(
					`Keycloak reported ${newUser.email} as existing but it could not be found.`
				);
			}
			const updateResponse = await keycloakContext.put(
				`/admin/realms/${KC_REALM}/users/${existingUser.id}`,
				{ data: representation }
			);
			if (!updateResponse.ok()) {
				throw new Error(
					`Failed to update Keycloak user ${newUser.email}. Keycloak responded with ${updateResponse.status()}: ${await updateResponse.text()}`
				);
			}
		}

		if (newUser.realmRoles && newUser.realmRoles.length > 0) {
			const user = await findUser();
			if (!user) {
				throw new Error(`Keycloak user ${newUser.email} could not be found after provisioning.`);
			}
			const roles = await Promise.all(
				newUser.realmRoles.map(async (name) => {
					const response = await keycloakContext.get(
						`/admin/realms/${KC_REALM}/roles/${encodeURIComponent(name)}`
					);
					if (!response.ok()) {
						throw new Error(
							`Failed to look up Keycloak realm role ${name}. Keycloak responded with ${response.status()}.`
						);
					}
					return (await response.json()) as { id: string; name: string };
				})
			);
			// Assigning an already-assigned role is a no-op, so this stays idempotent.
			const response = await keycloakContext.post(
				`/admin/realms/${KC_REALM}/users/${user.id}/role-mappings/realm`,
				{ data: roles }
			);
			if (!response.ok()) {
				throw new Error(
					`Failed to assign realm roles to Keycloak user ${user.id}. Keycloak responded with ${response.status()}: ${await response.text()}`
				);
			}
		}

		return newUser;
	} finally {
		await keycloakContext.dispose();
	}
}

export async function createContainer(context: BrowserContext, newContainer: NewContainer) {
	const response = await context.request.post('/container', { data: newContainer });

	if (!response.ok()) {
		throw new Error(`Failed to create ${newContainer.payload.type}: ${await response.text()}`);
	}

	const container = await response.json();

	// Wait for the indexing worker to pick up the event and refresh ES
	await new Promise((r) => setTimeout(r, 500));

	return container;
}

export async function deleteContainer(context: BrowserContext, container: Container<AnyPayload>) {
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

async function createResourceV2(
	context: BrowserContext,
	organization: string,
	title: string,
	payload: Partial<ResourceV2Payload>
): Promise<Container<ResourceV2Payload>> {
	const template = containerOfType(
		payloadTypes.enum.resource_v2,
		organization,
		null,
		organization,
		'knot-dots'
	) as Container<ResourceV2Payload>;
	return createContainer(context, {
		...template,
		payload: { ...template.payload, title, ...payload }
	});
}

async function createResourceData(
	context: BrowserContext,
	organization: string,
	title: string,
	payload: Partial<ResourceDataPayload>,
	partOf: string
): Promise<Container<ResourceDataPayload>> {
	const template = containerOfType(
		payloadTypes.enum.resource_data,
		organization,
		null,
		organization,
		'knot-dots'
	) as Container<ResourceDataPayload>;
	return createContainer(context, {
		...template,
		payload: { ...template.payload, title, ...payload },
		relation: [{ position: 0, predicate: predicates.enum['is-part-of'], object: partOf }]
	});
}

async function inviteUser(
	context: BrowserContext,
	email: string,
	container: Container<AnyPayload>,
	role: Predicate[] = []
) {
	const containerResponse = await context.request.get(`/container/${container.guid}`);

	const { user }: Container<AnyPayload> = await containerResponse.json();

	const inviteResponse = await context.request.post(`/user`, {
		data: { email, container: { ...container, user } }
	});

	const subject = inviteResponse.headers()['location'].split('/').at(-1);

	if (role.length > 0) {
		await context.request.post(`/container/${container.guid}/user`, {
			data: [
				...user.filter((u) => !(u.subject == subject && role.includes(u.predicate))),
				...role.concat(predicates.enum['is-member-of']).map((r) => ({
					predicate: r,
					subject
				}))
			]
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
	aiGoal: async ({ adminContext, testProgram }, use) => {
		const newGoal = containerOfType(
			payloadTypes.enum.goal,
			testProgram.organization,
			null,
			testProgram.organization,
			'knot-dots'
		) as Container<GoalPayload>;
		const testGoal = await createContainer(adminContext, {
			...newGoal,
			payload: {
				...newGoal.payload,
				aiContribution: 1,
				aiSuggestion: true,
				description: 'Lorem ipsum',
				title: 'Goal suggested by AI'
			},
			relation: [
				{
					position: 0,
					predicate: predicates.enum['is-part-of-program'],
					object: testProgram.guid
				}
			]
		});

		await use(testGoal);

		await deleteContainer(adminContext, testGoal);
	},
	allTable: async ({ page }, use) => {
		await use(new AllTable(page));
	},
	categoriesBoard: async ({ page }, use) => {
		await use(new CategoriesBoard(page));
	},
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
	dotsBoard: async ({ page }, use) => {
		await use(new DotsBoard(page));
	},
	indicatorCatalog: async ({ page }, use) => {
		await use(new IndicatorCatalog(page));
	},
	landingPage: async ({ page }, use) => {
		await use(new LandingPage(page));
	},
	organizationalUnitWithActualData: async (
		{ adminContext, testIndicatorTemplate, testOrganization },
		use
	) => {
		const newOrganizationalUnit = containerOfType(
			payloadTypes.enum.organizational_unit,
			testOrganization.guid,
			null,
			testOrganization.guid,
			'knot-dots'
		) as Container<OrganizationalUnitPayload>;
		const organizationalUnitWithActualData = await createContainer(adminContext, {
			...newOrganizationalUnit,
			payload: {
				...newOrganizationalUnit.payload,
				name: `Organizational unit with actual data`
			}
		});

		const newActualData = containerOfType(
			payloadTypes.enum.actual_data,
			testOrganization.guid,
			organizationalUnitWithActualData.guid,
			organizationalUnitWithActualData.guid,
			'knot-dots'
		) as Container<ActualDataPayload>;
		await createContainer(adminContext, {
			...newActualData,
			payload: {
				...newActualData.payload,
				indicator: testIndicatorTemplate.guid,
				source: 'Wegweiser Kommune',
				title: testIndicatorTemplate.payload.title
			}
		});

		await inviteUser(adminContext, 'bob@example.org', organizationalUnitWithActualData, [
			'is-collaborator-of'
		]);

		await use(organizationalUnitWithActualData);
	},
	programPage: async ({ page }, use) => {
		await use(new ProgramPage(page));
	},
	reportTemplate: async ({ adminContext, testOrganization }, use, workerInfo) => {
		const newReport = containerOfType(
			payloadTypes.enum.report,
			testOrganization.guid,
			null,
			testOrganization.guid,
			'knot-dots'
		) as Container<ReportPayload>;
		const reportTemplate = await createContainer(adminContext, {
			...newReport,
			payload: {
				...newReport.payload,
				template: true,
				title: `Report template ${workerInfo.workerIndex}`
			}
		});

		await use(reportTemplate);

		await deleteContainer(adminContext, reportTemplate);
	},
	resourceCatalog: async ({ page }, use) => {
		await use(new ResourceCatalog(page));
	},
	taskStatusBoard: async ({ page }, use) => {
		await use(new TaskStatusBoard(page));
	},
	testCategoryWithTerms: async ({ adminContext, testGoal }, use, workerInfo) => {
		const newCategory = containerOfType(
			payloadTypes.enum.category,
			testGoal.organization,
			null,
			testGoal.organization,
			'knot-dots'
		) as Container<CategoryPayload>;
		const category = await createContainer(adminContext, {
			...newCategory,
			payload: { ...newCategory.payload, title: `E2E Category ${workerInfo.project.name}` }
		});

		const terms: Container<TermPayload>[] = [];
		const termNames = [
			`E2E Term A ${workerInfo.project.name}`,
			`E2E Term B ${workerInfo.project.name}`
		];
		for (const [index, termName] of termNames.entries()) {
			const newTerm = containerOfType(
				payloadTypes.enum.term,
				testGoal.organization,
				null,
				testGoal.organization,
				'knot-dots'
			) as Container<TermPayload>;
			const term = await createContainer(adminContext, {
				...newTerm,
				payload: {
					...newTerm.payload,
					title: termName,
					value: termName.toLowerCase().replace(/\s+/g, '-')
				},
				relation: [
					{
						object: category.guid,
						position: index,
						predicate: predicates.enum['is-part-of-category']
					}
				]
			});
			terms.push(term);
		}

		await use({ category, terms, termNames });

		await deleteContainer(adminContext, category);
	},
	testOrganization: async ({ adminContext, defaultOrganization }, use, workerInfo) => {
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
				name: `Test Organization ${workerInfo.workerIndex}`
			}
		});
		await inviteUser(adminContext, 'bob@example.org', testOrganization);
		await inviteUser(adminContext, 'orla@example.org', testOrganization, [
			predicates.enum['is-admin-of']
		]);

		await use(testOrganization);

		await deleteContainer(adminContext, testOrganization);
	},
	testOrganizationalUnit: async ({ adminContext, testOrganization }, use, workerInfo) => {
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
	testIndividualProfile: async (
		{ adminContext, testOrganization, testOrganizationalUnit },
		use,
		workerInfo
	) => {
		const newIndividualProfile = containerOfType(
			payloadTypes.enum.organizational_unit,
			testOrganization.guid,
			null,
			testOrganization.guid,
			'knot-dots'
		) as Container<OrganizationalUnitPayload>;

		const testIndividualProfile = await createContainer(adminContext, {
			...newIndividualProfile,
			payload: {
				...newIndividualProfile.payload,
				name: `${testOrganizationalUnit.payload.name} - Individual ${workerInfo.workerIndex}`
			},
			relation: [
				{
					object: testOrganizationalUnit.guid,
					position: 0,
					predicate: predicates.enum['is-individual-profile-of']
				}
			]
		});

		await use(testIndividualProfile);

		await deleteContainer(adminContext, testIndividualProfile);
	},
	testProgram: async ({ adminContext, testOrganization }, use, workerInfo) => {
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
		await inviteUser(adminContext, 'bob@example.org', testProgram, [
			predicates.enum['is-head-of'],
			predicates.enum['is-member-of']
		]);

		await use(testProgram);

		await deleteContainer(adminContext, testProgram);
	},
	testGoal: async ({ adminContext, testOrganization }, use, workerInfo) => {
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
	testOrganizationalUnitGoal: async (
		{ adminContext, testOrganization, testOrganizationalUnit },
		use,
		workerInfo
	) => {
		const newGoal = containerOfType(
			payloadTypes.enum.goal,
			testOrganization.guid,
			testOrganizationalUnit.guid,
			testOrganizationalUnit.guid,
			'knot-dots'
		) as Container<GoalPayload>;
		const testOrganizationalUnitGoal = await createContainer(adminContext, {
			...newGoal,
			payload: {
				...newGoal.payload,
				title: `Organizational Unit Goal ${workerInfo.workerIndex}`
			}
		});

		await use(testOrganizationalUnitGoal);

		await deleteContainer(adminContext, testOrganizationalUnitGoal);
	},
	testSubordinateGoal: async ({ adminContext, testOrganization, testGoal }, use, workerInfo) => {
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
	testIndicatorTemplate: async ({ adminContext, testOrganization }, use, workerInfo) => {
		const newIndicatorTemplate = containerOfType(
			payloadTypes.enum.indicator_template,
			testOrganization.guid,
			null,
			testOrganization.guid,
			'knot-dots'
		) as Container<IndicatorTemplatePayload>;
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
	testObjective: async (
		{ adminContext, testOrganization, testGoal, testIndicatorTemplate },
		use,
		workerInfo
	) => {
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
					object: testIndicatorTemplate.guid
				}
			]
		});

		await use(testObjective);

		await deleteContainer(adminContext, testObjective);
	},
	testMeasure: async ({ adminContext, testOrganization, testProgram }, use, workerInfo) => {
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
	testSubordinateMeasure: async (
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
	testEffect: async (
		{ adminContext, testOrganization, testMeasure, testIndicatorTemplate },
		use,
		workerInfo
	) => {
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
			},
			relation: [
				{
					position: 0,
					predicate: predicates.enum['is-part-of'],
					object: testMeasure.guid
				},
				{
					position: 1,
					predicate: predicates.enum['is-measured-by'],
					object: testIndicatorTemplate.guid
				}
			]
		});

		await use(testEffect);

		await deleteContainer(adminContext, testEffect);
	},
	testResourceV2: async ({ adminContext, testOrganization }, use, workerInfo) => {
		const testResourceV2 = await createResourceV2(
			adminContext,
			testOrganization.guid,
			`Test Resource ${workerInfo.workerIndex}`,
			{ resourceCategory: 'resource_category.money', resourceUnit: 'unit.euro' }
		);
		await use(testResourceV2);
		await deleteContainer(adminContext, testResourceV2);
	},
	testResourceDataBudget: async (
		{ adminContext, testOrganization, testMeasure, testResourceV2 },
		use,
		workerInfo
	) => {
		const testResourceDataBudget = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Test Budget ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				resource: testResourceV2.guid,
				entries: [
					{ year: 2025, amount: 10000 },
					{ year: 2026, amount: 15000 }
				]
			},
			testMeasure.guid
		);
		await use(testResourceDataBudget);
		await deleteContainer(adminContext, testResourceDataBudget);
	},
	testResourceDataPlanned: async (
		{ adminContext, testOrganization, testMeasure, testResourceV2 },
		use,
		workerInfo
	) => {
		const testResourceDataPlanned = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Test Planned ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.planned_resource_allocation'],
				resource: testResourceV2.guid,
				entries: [
					{ year: 2025, amount: 8000 },
					{ year: 2026, amount: 12000 }
				]
			},
			testMeasure.guid
		);
		await use(testResourceDataPlanned);
		await deleteContainer(adminContext, testResourceDataPlanned);
	},
	testResourceDataActual: async (
		{ adminContext, testOrganization, testMeasure, testResourceV2 },
		use,
		workerInfo
	) => {
		const testResourceDataActual = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Test Actual ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.actual_resource_allocation'],
				resource: testResourceV2.guid,
				entries: [
					{ year: 2025, amount: 7500 },
					{ year: 2026, amount: 11000 }
				]
			},
			testMeasure.guid
		);
		await use(testResourceDataActual);
		await deleteContainer(adminContext, testResourceDataActual);
	},
	testGoalBudget: async (
		{ adminContext, testOrganization, testGoal, testResourceV2 },
		use,
		workerInfo
	) => {
		const testGoalBudget = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Goal Budget ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				resource: testResourceV2.guid,
				entries: [
					{ year: 2025, amount: 50000 },
					{ year: 2026, amount: 60000 }
				]
			},
			testGoal.guid
		);
		await use(testGoalBudget);
		await deleteContainer(adminContext, testGoalBudget);
	},
	testSubordinateGoalBudget: async (
		{ adminContext, testOrganization, testSubordinateGoal, testResourceV2 },
		use,
		workerInfo
	) => {
		const testSubordinateGoalBudget = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Sub Goal Budget ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				resource: testResourceV2.guid,
				entries: [
					{ year: 2025, amount: 20000 },
					{ year: 2026, amount: 25000 }
				]
			},
			testSubordinateGoal.guid
		);
		await use(testSubordinateGoalBudget);
		await deleteContainer(adminContext, testSubordinateGoalBudget);
	},
	testSubordinateMeasureResourceData: async (
		{ adminContext, testOrganization, testSubordinateMeasure, testResourceV2 },
		use,
		workerInfo
	) => {
		const testSubordinateMeasureResourceData = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Sub Measure Data ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				resource: testResourceV2.guid,
				entries: [
					{ year: 2025, amount: 5000 },
					{ year: 2026, amount: 7000 }
				]
			},
			testSubordinateMeasure.guid
		);
		await use(testSubordinateMeasureResourceData);
		await deleteContainer(adminContext, testSubordinateMeasureResourceData);
	},
	testResourceV2Other: async ({ adminContext, testOrganization }, use, workerInfo) => {
		const testResourceV2Other = await createResourceV2(
			adminContext,
			testOrganization.guid,
			`Other Resource ${workerInfo.workerIndex}`,
			{ resourceCategory: 'resource_category.money', resourceUnit: 'unit.euro' }
		);
		await use(testResourceV2Other);
		await deleteContainer(adminContext, testResourceV2Other);
	},
	testSubordinateGoalBudgetOtherResource: async (
		{ adminContext, testOrganization, testSubordinateGoal, testResourceV2Other },
		use,
		workerInfo
	) => {
		const testSubordinateGoalBudgetOtherResource = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Sub Goal Budget Other ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				resource: testResourceV2Other.guid,
				entries: [
					{ year: 2025, amount: 99000 },
					{ year: 2026, amount: 99000 }
				]
			},
			testSubordinateGoal.guid
		);
		await use(testSubordinateGoalBudgetOtherResource);
		await deleteContainer(adminContext, testSubordinateGoalBudgetOtherResource);
	},
	testSubordinateMeasureResourceDataOtherResource: async (
		{ adminContext, testOrganization, testSubordinateMeasure, testResourceV2Other },
		use,
		workerInfo
	) => {
		const testSubordinateMeasureResourceDataOtherResource = await createResourceData(
			adminContext,
			testOrganization.guid,
			`Sub Measure Data Other ${workerInfo.workerIndex}`,
			{
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				resource: testResourceV2Other.guid,
				entries: [
					{ year: 2025, amount: 99000 },
					{ year: 2026, amount: 99000 }
				]
			},
			testSubordinateMeasure.guid
		);
		await use(testSubordinateMeasureResourceDataOtherResource);
		await deleteContainer(adminContext, testSubordinateMeasureResourceDataOtherResource);
	},
	testTaskCollection: async ({ adminContext, testGoal }, use) => {
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
	testTask: async ({ adminContext, testTaskCollection, testGoal }, use, workerInfo) => {
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
	testReport: async ({ adminContext, testOrganization }, use, workerInfo) => {
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
	testPublicReport: async ({ adminContext, testOrganization }, use, workerInfo) => {
		const newReport = containerOfType(
			payloadTypes.enum.report,
			testOrganization.guid,
			null,
			testOrganization.guid,
			'knot-dots'
		) as Container<ReportPayload>;
		const testPublicReport = await createContainer(adminContext, {
			...newReport,
			payload: {
				...newReport.payload,
				title: `Test Public Report ${workerInfo.workerIndex}`,
				visibility: 'public'
			}
		});

		await use(testPublicReport);

		await deleteContainer(adminContext, testPublicReport);
	},
	testPublicProgram: async ({ adminContext, defaultOrganization }, use, workerInfo) => {
		const newProgram = containerOfType(
			payloadTypes.enum.program,
			defaultOrganization.guid,
			null,
			defaultOrganization.guid,
			'knot-dots'
		) as Container<ProgramPayload>;
		const testPublicProgram = await createContainer(adminContext, {
			...newProgram,
			payload: {
				...newProgram.payload,
				programType: programTypes.enum['program_type.set_of_rules'],
				title: `Test Public Program ${workerInfo.workerIndex}`,
				visibility: 'public'
			}
		});

		await use(testPublicProgram);

		await deleteContainer(adminContext, testPublicProgram);
	}
});

export { expect } from '@playwright/test';
