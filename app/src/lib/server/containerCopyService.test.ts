import { NotFoundError, type DatabasePool } from 'slonik';
import { beforeEach, expect, test, vi } from 'vitest';

import { CopyPlanError, type ContainerCopyPlan } from '$lib/server/containerCopyPlan';

const mocks = vi.hoisted(() => ({
	graph: undefined as unknown,
	getContainerByGuid: vi.fn(),
	targets: new Map<string, unknown>(),
	persist: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	getContainerCopyGraph: () => async () => mocks.graph,
	getContainerByGuid: (guid: string) => mocks.getContainerByGuid(guid)
}));

vi.mock('$lib/server/containerCopyPersistence', () => ({
	persistContainerCopyPlan: (plan: ContainerCopyPlan) => async () => {
		mocks.persist(plan);
		return new Map(
			[...plan].map(([originalGuid, container]) => [
				originalGuid,
				{
					...container,
					revision: 1,
					valid_currently: true,
					valid_from: new Date('2026-01-01T00:00:00.000Z')
				}
			])
		);
	}
}));

import { anyContainer, payloadTypes, predicates, visibility } from '$lib/models';
import { ContainerCopyServiceError, executeContainerCopy } from '$lib/server/containerCopyService';
import type { User } from '$lib/stores';

const sourceGuid = '00000000-0000-4000-8000-000000000001';
const childGuid = '00000000-0000-4000-8000-000000000002';
const organizationGuid = '10000000-0000-4000-8000-000000000000';
const otherOrganizationGuid = '10000000-0000-4000-8000-000000000001';
const creatorGuid = '20000000-0000-4000-8000-000000000000';

function container(
	guid: string,
	payload: Record<string, unknown>,
	relations: Array<{ object: string; position: number; predicate: string; subject: string }> = [],
	organization = organizationGuid
) {
	return anyContainer.parse({
		guid,
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload,
		realm: 'source-realm',
		relation: relations,
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

const organization = container(organizationGuid, {
	name: 'Target organization',
	type: payloadTypes.enum.organization,
	visibility: visibility.enum.public
});
organization.realm = 'target-realm';

const sysadmin: User = {
	adminOf: [],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: creatorGuid,
	headOf: [],
	isAuthenticated: true,
	memberOf: [],
	roles: ['sysadmin'],
	settings: {}
};

const pool = {
	connect: async (operation: Parameters<DatabasePool['connect']>[0]) =>
		operation({} as Parameters<Parameters<DatabasePool['connect']>[0]>[0])
} as DatabasePool;

beforeEach(() => {
	mocks.persist.mockReset();
	mocks.targets = new Map([[organizationGuid, organization]]);
	mocks.getContainerByGuid.mockReset();
	mocks.getContainerByGuid.mockImplementation((guid: string) => async () => {
		const target = mocks.targets.get(guid);
		if (!target) {
			throw new NotFoundError('Target not found', { sql: '', values: [] });
		}
		return target;
	});
});

test('derives the target envelope server-side and returns the persisted root-map entry', async () => {
	const source = container(sourceGuid, {
		title: 'Source',
		type: payloadTypes.enum.program,
		visibility: visibility.enum.public
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [source] };
	if (source.payload.type !== payloadTypes.enum.program) {
		throw new Error('Expected a program');
	}

	const root = await executeContainerCopy({
		request: {
			operation: 'copy',
			sourceGuid,
			targetOrganizationGuid: organizationGuid,
			targetOrganizationalUnitGuid: null,
			rootPayload: { ...source.payload, title: 'Edited' }
		},
		pool,
		user: sysadmin,
		maxPlanSize: 500
	});

	expect(root.payload).toMatchObject({ title: 'Edited' });
	expect(root).toMatchObject({
		organization: organizationGuid,
		organizational_unit: null,
		realm: 'target-realm',
		user: [{ predicate: predicates.enum['is-creator-of'], subject: creatorGuid }]
	});
	expect(mocks.persist).toHaveBeenCalledOnce();
});

test('rejects an oversized plan before persistence', async () => {
	const structuralRelation = {
		object: sourceGuid,
		position: 0,
		predicate: predicates.enum['is-section-of'],
		subject: childGuid
	};
	const source = container(
		sourceGuid,
		{ title: 'Source', type: payloadTypes.enum.program, visibility: visibility.enum.public },
		[structuralRelation]
	);
	const child = container(
		childGuid,
		{ title: 'Child', type: payloadTypes.enum.text, visibility: visibility.enum.public },
		[structuralRelation]
	);
	mocks.graph = { rootGuid: sourceGuid, containers: [source, child] };

	await expect(
		executeContainerCopy({
			request: {
				operation: 'copy',
				sourceGuid,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: null,
				rootPayload: source.payload
			},
			pool,
			user: sysadmin,
			maxGraphSize: 500,
			maxPlanSize: 1
		})
	).rejects.toEqual(new ContainerCopyServiceError('copy_too_large'));
	expect(mocks.persist).not.toHaveBeenCalled();
});

test('rejects an oversized graph after source authorization and before planning', async () => {
	const source = container(sourceGuid, {
		title: 'Source',
		type: payloadTypes.enum.text,
		visibility: visibility.enum.public
	});
	const reference = container(childGuid, {
		title: 'Reference',
		type: payloadTypes.enum.text,
		visibility: visibility.enum.public
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [source, reference] };

	await expect(
		executeContainerCopy({
			request: {
				operation: 'copy',
				sourceGuid,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: null,
				rootPayload: source.payload
			},
			pool,
			user: sysadmin,
			maxGraphSize: 1,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('copy_too_large'));
	expect(mocks.persist).not.toHaveBeenCalled();
});

test('fails the complete operation when any planned container cannot be created', async () => {
	const structuralRelation = {
		object: sourceGuid,
		position: 0,
		predicate: predicates.enum['is-section-of'],
		subject: childGuid
	};
	const source = container(
		sourceGuid,
		{ title: 'Source', type: payloadTypes.enum.text, visibility: visibility.enum.public },
		[structuralRelation]
	);
	const child = container(
		childGuid,
		{ title: 'Category', type: payloadTypes.enum.category, visibility: visibility.enum.public },
		[structuralRelation]
	);
	mocks.graph = { rootGuid: sourceGuid, containers: [source, child] };

	await expect(
		executeContainerCopy({
			request: {
				operation: 'copy',
				sourceGuid,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: null,
				rootPayload: source.payload
			},
			pool,
			user: { ...sysadmin, collaboratorOf: [organizationGuid], roles: [] },
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('create_forbidden'));
	expect(mocks.persist).not.toHaveBeenCalled();
});

test('uses the same opaque failure for missing and unreadable sources', async () => {
	mocks.graph = { rootGuid: sourceGuid, containers: [] };
	const publicSource = container(sourceGuid, {
		title: 'Source',
		type: payloadTypes.enum.text,
		visibility: visibility.enum.public
	});
	const copyRequest = {
		operation: 'copy' as const,
		sourceGuid,
		targetOrganizationGuid: organizationGuid,
		targetOrganizationalUnitGuid: null,
		rootPayload: publicSource.payload
	};

	await expect(
		executeContainerCopy({ request: copyRequest, pool, user: sysadmin, maxPlanSize: 500 })
	).rejects.toEqual(new ContainerCopyServiceError('source_unavailable'));

	const privateSource = container(sourceGuid, {
		title: 'Private source',
		type: payloadTypes.enum.text,
		visibility: visibility.enum.organization
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [privateSource] };
	await expect(
		executeContainerCopy({
			request: { ...copyRequest, rootPayload: privateSource.payload },
			pool,
			user: { ...sysadmin, roles: [] },
			maxGraphSize: 0,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('source_unavailable'));
	expect(mocks.persist).not.toHaveBeenCalled();
});

test('rejects missing, malformed, and cross-organization targets', async () => {
	const source = container(sourceGuid, {
		title: 'Source',
		type: payloadTypes.enum.text,
		visibility: visibility.enum.public
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [source] };
	const request = {
		operation: 'copy' as const,
		sourceGuid,
		targetOrganizationGuid: otherOrganizationGuid,
		targetOrganizationalUnitGuid: null,
		rootPayload: source.payload
	};

	await expect(
		executeContainerCopy({ request, pool, user: sysadmin, maxPlanSize: 500 })
	).rejects.toEqual(new ContainerCopyServiceError('invalid_target'));

	mocks.targets.set(otherOrganizationGuid, source);
	await expect(
		executeContainerCopy({ request, pool, user: sysadmin, maxPlanSize: 500 })
	).rejects.toEqual(new ContainerCopyServiceError('invalid_target'));

	const organizationalUnitGuid = '00000000-0000-4000-8000-000000000005';
	const organizationalUnit = container(
		organizationalUnitGuid,
		{
			name: 'Other unit',
			type: payloadTypes.enum.organizational_unit,
			visibility: visibility.enum.public
		},
		[],
		otherOrganizationGuid
	);
	mocks.targets.set(otherOrganizationGuid, {
		...organization,
		guid: otherOrganizationGuid,
		organization: otherOrganizationGuid,
		managed_by: [otherOrganizationGuid]
	});
	mocks.targets.set(organizationalUnitGuid, organizationalUnit);
	await expect(
		executeContainerCopy({
			request: {
				...request,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: organizationalUnitGuid
			},
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('invalid_target'));
	expect(mocks.persist).not.toHaveBeenCalled();
});

test('applies template-instance policy through the service', async () => {
	const source = container(sourceGuid, {
		template: true,
		title: 'Template',
		type: payloadTypes.enum.program,
		visibility: visibility.enum.public
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [source] };
	if (source.payload.type !== payloadTypes.enum.program) {
		throw new Error('Expected a program template');
	}

	const root = await executeContainerCopy({
		request: {
			operation: 'template-instance',
			availableIn: null,
			sourceGuid,
			targetOrganizationGuid: organizationGuid,
			targetOrganizationalUnitGuid: null,
			rootPayload: { ...source.payload, title: 'Edited template instance' }
		},
		pool,
		user: sysadmin,
		maxPlanSize: 500
	});

	expect(root.payload).toMatchObject({ template: false, title: 'Edited template instance' });
	expect(mocks.persist).toHaveBeenCalledOnce();
});

test('creates a template through the service and rejects existing templates', async () => {
	const source = container(sourceGuid, {
		title: 'Program',
		type: payloadTypes.enum.program,
		visibility: visibility.enum.public
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [source] };
	if (source.payload.type !== payloadTypes.enum.program) {
		throw new Error('Expected a program');
	}

	const root = await executeContainerCopy({
		request: {
			operation: 'create-template',
			sourceGuid,
			targetOrganizationGuid: organizationGuid,
			targetOrganizationalUnitGuid: null,
			rootPayload: { ...source.payload, title: 'Edited template' }
		},
		pool,
		user: sysadmin,
		maxPlanSize: 500
	});

	expect(root.payload).toMatchObject({
		template: true,
		title: 'Edited template'
	});

	const existingTemplate = container(sourceGuid, {
		template: true,
		title: 'Existing template',
		type: payloadTypes.enum.program,
		visibility: visibility.enum.public
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [existingTemplate] };
	await expect(
		executeContainerCopy({
			request: {
				operation: 'create-template',
				sourceGuid,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: null,
				rootPayload: existingTemplate.payload
			},
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('unsupported_copy_source'));
});

test('requires a scoped template instance to name its readable program', async () => {
	const programGuid = childGuid;
	const program = container(programGuid, {
		title: 'Program',
		type: payloadTypes.enum.program,
		visibility: visibility.enum.public
	});
	const source = container(
		sourceGuid,
		{
			template: true,
			title: 'Scoped template',
			type: payloadTypes.enum.report,
			visibility: visibility.enum.public
		},
		[
			{
				object: programGuid,
				position: 0,
				predicate: predicates.enum['is-available-in'],
				subject: sourceGuid
			}
		]
	);
	mocks.graph = { rootGuid: sourceGuid, containers: [source, program] };

	const request = {
		operation: 'template-instance' as const,
		availableIn: programGuid,
		sourceGuid,
		targetOrganizationGuid: organizationGuid,
		targetOrganizationalUnitGuid: null,
		rootPayload: { ...source.payload, title: 'Instance' }
	};

	await expect(
		executeContainerCopy({ request, pool, user: sysadmin, maxPlanSize: 500 })
	).resolves.toMatchObject({ payload: { template: false, title: 'Instance' } });
	expect(mocks.getContainerByGuid).toHaveBeenCalledOnce();
	expect(mocks.getContainerByGuid).toHaveBeenCalledWith(organizationGuid);

	await expect(
		executeContainerCopy({
			request: { ...request, availableIn: null },
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('source_unavailable'));

	source.relation.push({
		object: otherOrganizationGuid,
		position: 0,
		predicate: predicates.enum['is-available-in'],
		subject: sourceGuid
	});
	await expect(
		executeContainerCopy({ request, pool, user: sysadmin, maxPlanSize: 500 })
	).rejects.toEqual(new ContainerCopyServiceError('source_unavailable'));
});

test('retains public and same-organization collection references only', async () => {
	const privateItemGuid = '00000000-0000-4000-8000-000000000010';
	const publicItemGuid = '00000000-0000-4000-8000-000000000011';
	const localItemGuid = '00000000-0000-4000-8000-000000000012';
	const privateTemplateGuid = '00000000-0000-4000-8000-000000000013';
	const publicTemplateGuid = '00000000-0000-4000-8000-000000000014';
	const localTemplateGuid = '00000000-0000-4000-8000-000000000015';
	const scopedTemplateGuid = '00000000-0000-4000-8000-000000000016';
	const source = container(sourceGuid, {
		allowSearch: false,
		allowSort: false,
		filter: {},
		item: [privateItemGuid, publicItemGuid, localItemGuid],
		listType: 'wall',
		newItemTemplate: [
			privateTemplateGuid,
			publicTemplateGuid,
			localTemplateGuid,
			scopedTemplateGuid
		],
		showDescription: false,
		sort: 'alpha',
		terms: '',
		title: 'Collection',
		type: payloadTypes.enum.custom_collection,
		visibility: visibility.enum.public
	});
	const references = [
		container(
			privateItemGuid,
			{ title: 'Private foreign item', type: payloadTypes.enum.text },
			[],
			otherOrganizationGuid
		),
		container(
			publicItemGuid,
			{
				title: 'Public foreign item',
				type: payloadTypes.enum.text,
				visibility: visibility.enum.public
			},
			[],
			otherOrganizationGuid
		),
		container(localItemGuid, { title: 'Private local item', type: payloadTypes.enum.text }),
		container(
			privateTemplateGuid,
			{ template: true, title: 'Private foreign template', type: payloadTypes.enum.program },
			[],
			otherOrganizationGuid
		),
		container(
			publicTemplateGuid,
			{
				template: true,
				title: 'Public foreign template',
				type: payloadTypes.enum.program,
				visibility: visibility.enum.public
			},
			[],
			otherOrganizationGuid
		),
		container(localTemplateGuid, {
			template: true,
			title: 'Private local template',
			type: payloadTypes.enum.program
		}),
		container(
			scopedTemplateGuid,
			{
				template: true,
				title: 'Program-scoped template',
				type: payloadTypes.enum.program
			},
			[
				{
					object: childGuid,
					position: 0,
					predicate: predicates.enum['is-available-in'],
					subject: scopedTemplateGuid
				}
			]
		)
	];
	mocks.graph = { rootGuid: sourceGuid, containers: [source, ...references] };

	const root = await executeContainerCopy({
		request: {
			operation: 'copy',
			sourceGuid,
			targetOrganizationGuid: organizationGuid,
			targetOrganizationalUnitGuid: null,
			rootPayload: source.payload
		},
		pool,
		user: sysadmin,
		maxPlanSize: 500
	});

	expect(root.payload).toMatchObject({
		item: [publicItemGuid, localItemGuid],
		newItemTemplate: [publicTemplateGuid, localTemplateGuid]
	});
});

test('rejects organization roots and duplicate individual profiles before persistence', async () => {
	mocks.graph = { rootGuid: organizationGuid, containers: [organization] };
	await expect(
		executeContainerCopy({
			request: {
				operation: 'copy',
				sourceGuid: organizationGuid,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: null,
				rootPayload: organization.payload
			},
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('unsupported_copy_source'));

	const profileGuid = '00000000-0000-4000-8000-000000000004';
	const profileRelation = {
		object: sourceGuid,
		position: 0,
		predicate: predicates.enum['is-individual-profile-of'],
		subject: profileGuid
	};
	const organizationalUnit = container(
		sourceGuid,
		{
			name: 'Unit',
			type: payloadTypes.enum.organizational_unit,
			visibility: visibility.enum.public
		},
		[profileRelation]
	);
	mocks.graph = { rootGuid: sourceGuid, containers: [organizationalUnit] };
	await expect(
		executeContainerCopy({
			request: { operation: 'individual-profile', sourceGuid },
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('individual_profile_exists'));

	const existingProfile = container(
		profileGuid,
		{
			name: 'Individual profile',
			type: payloadTypes.enum.organizational_unit,
			visibility: visibility.enum.public
		},
		[profileRelation]
	);
	mocks.graph = { rootGuid: profileGuid, containers: [existingProfile] };
	await expect(
		executeContainerCopy({
			request: { operation: 'individual-profile', sourceGuid: profileGuid },
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new ContainerCopyServiceError('unsupported_copy_source'));
	expect(mocks.persist).not.toHaveBeenCalled();
});

test('rejects actual data roots before persistence', async () => {
	const actualData = container(sourceGuid, {
		indicator: childGuid,
		title: 'Actual data',
		type: payloadTypes.enum.actual_data,
		visibility: visibility.enum.organization
	});
	mocks.graph = { rootGuid: sourceGuid, containers: [actualData] };

	await expect(
		executeContainerCopy({
			request: {
				operation: 'copy',
				sourceGuid,
				targetOrganizationGuid: organizationGuid,
				targetOrganizationalUnitGuid: null,
				rootPayload: actualData.payload
			},
			pool,
			user: sysadmin,
			maxPlanSize: 500
		})
	).rejects.toEqual(new CopyPlanError('unsupported_copy_source'));
	expect(mocks.persist).not.toHaveBeenCalled();
});
