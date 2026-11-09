import {
	NotFoundError,
	UniqueIntegrityConstraintViolationError,
	type DatabaseConnection
} from 'slonik';
import defineAbilityFor from '$lib/authorization';
import { getFeatures } from '$lib/server/features';
import {
	containerOfType,
	getPayloadSchema,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	isMeasureContainer,
	mayHaveStructuralParent,
	payloadTypes,
	predicates,
	type PayloadType,
	type AnyPayload,
	type Container,
	type MeasurePayload,
	type NewContainer
} from '$lib/models';
import {
	ContainerCreationError,
	createAuthorizedContainer,
	createAuthorizedContainers
} from '$lib/server/containerCreation';
import { getContainerByGuid, getManyContainers, recordMcpWriteEvent } from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { findUnknownCategory, loadMcpCategoryContext } from '$lib/server/mcp/categories';
import { summarizeContainer } from '$lib/server/mcp/containers';
import {
	createContainersToolName,
	createContainerToolName,
	mcpSectionParentTypes,
	type CreateContainersInput,
	type CreateContainersOutput,
	type McpParentRelationPredicate,
	type CreateContainerInput
} from '$lib/server/mcp/contracts/creation';
import { mcpPayloadTypes } from '$lib/server/mcp/contracts/payloads';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';
import type { User } from '$lib/stores';

const maxHierarchyLevel = 6;

export class McpCreationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpCreationError';
	}
}

export async function findVisibleContainer(
	connection: DatabaseConnection,
	user: User,
	guid: string
): Promise<Container<AnyPayload> | null> {
	try {
		const container = await getContainerByGuid(guid)(connection);
		return defineAbilityFor(user).can('read', container) ? container : null;
	} catch (error) {
		if (error instanceof NotFoundError) return null;
		throw error;
	}
}

function mapCreationError(error: unknown): never {
	if (error instanceof ContainerCreationError) {
		const message =
			error.kind === 'forbidden'
				? 'You are not allowed to create content in this context.'
				: 'The container could not be created with the supplied data.';
		// Names the container that failed among several created together.
		throw new McpCreationError(
			error.index === undefined ? message : `containers[${error.index}]: ${message}`
		);
	}
	throw error;
}

export function payloadValidationMessage(error: {
	issues: Array<{ message: string; path: PropertyKey[] }>;
}) {
	return error.issues
		.map(
			({ message, path }) =>
				`${path.length > 0 ? `payload.${path.join('.')}` : 'payload'}: ${message}`
		)
		.join('; ');
}

// Content created through MCP is written by an AI agent, so it is marked as
// AI-generated like the containers extracted by the AI endpoints, whatever
// the payload says.
function markAsAiGenerated<T extends NewContainer>(data: T) {
	if ('aiContribution' in data.payload) {
		data.payload.aiContribution = 1;
	}
	return data;
}

export function createAndRecordContainer({
	auth: { clientId, tokenId, userId },
	data,
	tool,
	user
}: {
	auth: McpAuth;
	data: NewContainer;
	tool: string;
	user: User;
}) {
	markAsAiGenerated(data);

	return async (connection: DatabaseConnection): Promise<Container<AnyPayload>> => {
		try {
			return await createAuthorizedContainer({
				afterCreate: (created, txConnection) =>
					recordMcpWriteEvent({
						clientId,
						containerGuid: created.guid,
						revision: created.revision,
						tokenId,
						tool,
						userId
					})(txConnection),
				data,
				features: getFeatures(),
				user
			})(connection);
		} catch (error) {
			mapCreationError(error);
		}
	};
}

// Parent types allowed for is-part-of, following the parents the web
// application offers for each type.
const isPartOfParentTypes: Partial<Record<PayloadType, readonly PayloadType[]>> = {
	[payloadTypes.enum.effect]: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
	[payloadTypes.enum.goal]: [payloadTypes.enum.goal],
	[payloadTypes.enum.knowledge]: [payloadTypes.enum.knowledge],
	[payloadTypes.enum.objective]: [payloadTypes.enum.goal],
	[payloadTypes.enum.measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
	[payloadTypes.enum.simple_measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
	[payloadTypes.enum.task]: [payloadTypes.enum.goal, payloadTypes.enum.measure]
};

// Section types MCP can create, and the containers whose detail view in the
// web application shows sections.
const sectionTypes: readonly PayloadType[] = [
	payloadTypes.enum.custom_collection,
	payloadTypes.enum.text
];
const sectionParentTypes: readonly PayloadType[] = mcpSectionParentTypes;

// Types that can be part of a program, as in the web application. The
// detail view of a program follows is-section-of only, so like the web
// application the server makes a part of a program a section of it as well.
const programPartTypes: readonly PayloadType[] = [
	payloadTypes.enum.goal,
	payloadTypes.enum.knowledge,
	payloadTypes.enum.measure,
	payloadTypes.enum.rule,
	payloadTypes.enum.simple_measure
];

// Containers that can scope the templates of measures, as isMeasureTemplateScope.
const measureTemplateScopeTypes: readonly PayloadType[] = [
	payloadTypes.enum.measure,
	payloadTypes.enum.simple_measure
];

// The position after the existing children of the parent.
function nextPosition(
	relations: ReadonlyArray<{ object?: string; position: number; predicate: string }>,
	parentGuid: string,
	predicate: string
) {
	return (
		Math.max(
			-1,
			...relations
				.filter((relation) => relation.object === parentGuid && relation.predicate === predicate)
				.map(({ position }) => position)
		) + 1
	);
}

// Structural relations drive hierarchy, grants and ownership, so the parent
// must be of a type the relation is meant for.
function isValidParent(
	type: PayloadType,
	predicate: McpParentRelationPredicate,
	parentType: PayloadType
) {
	if (!mayHaveStructuralParent(type)) {
		return false;
	}
	switch (predicate) {
		case predicates.enum['is-part-of-program']:
			return parentType === payloadTypes.enum.program && programPartTypes.includes(type);
		case predicates.enum['is-part-of-measure']:
			return measureTemplateScopeTypes.includes(parentType);
		case predicates.enum['is-part-of']:
			return isPartOfParentTypes[type]?.includes(parentType) ?? false;
		case predicates.enum['is-section-of']:
			return sectionTypes.includes(type) && sectionParentTypes.includes(parentType);
	}
}

// The input of create_container for any payload type, so that the tools for
// types without a payload schema resource create containers the same way.
export type McpContainerCreation = Omit<CreateContainerInput, 'payload'> & {
	payload: { type: PayloadType } & Record<string, unknown>;
};

type PlannedContainer = NewContainer & { guid: string };

// A container a new one refers to: one that exists already, or one created
// earlier in the same call.
type McpRelatedContainer = Container<AnyPayload> | PlannedContainer;

type McpCreationContext = {
	connection: DatabaseConnection;
	// Containers that exist already and that the new ones refer to, visible to
	// the user and in the organization.
	existing: ReadonlyMap<string, Container<AnyPayload>>;
	loadCategoryContext: (type: PayloadType) => ReturnType<typeof loadMcpCategoryContext>;
	organization: Container<AnyPayload>;
	// The GUIDs of all containers created in the same call, and the ones
	// checked so far.
	pending: ReadonlySet<string>;
	planned: ReadonlyMap<string, PlannedContainer>;
	user: User;
};

async function findMcpOrganization(connection: DatabaseConnection, user: User, guid: string) {
	const organization = await findVisibleContainer(connection, user, guid);
	if (!organization || !isOrganizationContainer(organization)) {
		throw new McpCreationError('Organization or organizational unit not found or inaccessible.');
	}
	return organization;
}

async function findReferencedContainers(
	connection: DatabaseConnection,
	user: User,
	organization: Container<AnyPayload>,
	guids: string[]
) {
	const unique = [...new Set(guids)];
	if (unique.length === 0) {
		return new Map<string, Container<AnyPayload>>();
	}
	const ability = defineAbilityFor(user);
	const found = await getManyContainers([], { guid: unique }, 'alpha')(connection);
	return new Map(
		found
			.filter((container) => container.organization === organization.guid)
			.filter((container) => ability.can('read', container))
			.map((container) => [container.guid, container])
	);
}

// Checks a new container against its organization and parents and returns
// it ready to be authorized.
async function planMcpContainer(
	context: McpCreationContext,
	input: Pick<McpContainerCreation, 'organizationalUnitGuid' | 'parentRelations' | 'payload'>
): Promise<NewContainer> {
	const { connection, existing, organization, pending, planned, user } = context;
	const payloadResult = getPayloadSchema(input.payload.type).safeParse(input.payload);
	if (!payloadResult.success) {
		throw new McpCreationError(payloadValidationMessage(payloadResult.error));
	}
	if ('template' in payloadResult.data && payloadResult.data.template === true) {
		throw new McpCreationError(
			'Containers marked as templates (template: true) cannot be created by this tool.'
		);
	}

	const parentsByGuid = new Map<string, McpRelatedContainer>();
	for (const { parentGuid } of input.parentRelations) {
		const parent = pending.has(parentGuid) ? planned.get(parentGuid) : existing.get(parentGuid);
		if (!parent) {
			throw new McpCreationError(
				pending.has(parentGuid)
					? 'A parent created in the same call must be listed before its children.'
					: 'Parent container not found or inaccessible.'
			);
		}
		parentsByGuid.set(parentGuid, parent);
	}
	for (const { parentGuid, predicate } of input.parentRelations) {
		const parent = parentsByGuid.get(parentGuid);
		if (parent && !isValidParent(input.payload.type, predicate, parent.payload.type)) {
			throw new McpCreationError(
				`A ${parent.payload.type} cannot be the ${predicate} parent of a ${input.payload.type}.`
			);
		}
	}
	const parents = [...parentsByGuid.values()];
	// As in the bulk creation of the web application, the permissions of a
	// container derive from a parent that exists already.
	if (parents.length > 0 && parents.every(({ guid }) => pending.has(guid))) {
		throw new McpCreationError(
			'At least one parent must exist already, since the container gets its permissions from it; create the parents in an earlier call.'
		);
	}

	// Like a container created within its parents in the web application,
	// the container belongs to the organizational unit of its parents,
	// whose grants authorize the creation. A section of an organizational
	// unit belongs to the unit itself.
	const parentUnits = [
		...new Set(
			parents.map((parent) =>
				isOrganizationalUnitContainer(parent) ? parent.guid : parent.organizational_unit
			)
		)
	];
	if (parentUnits.length > 1) {
		throw new McpCreationError('All parents must belong to the same organizational unit.');
	}
	if (
		parents.length > 0 &&
		input.organizationalUnitGuid !== null &&
		input.organizationalUnitGuid !== parentUnits[0]
	) {
		throw new McpCreationError(
			'The organizational unit must be the one of the parents; omit it to use theirs.'
		);
	}
	const organizationalUnitGuid = parents.length > 0 ? parentUnits[0] : input.organizationalUnitGuid;

	let organizationalUnit: Container<AnyPayload> | null = null;
	if (organizationalUnitGuid) {
		organizationalUnit = await findVisibleContainer(connection, user, organizationalUnitGuid);
		if (
			!organizationalUnit ||
			!isOrganizationalUnitContainer(organizationalUnit) ||
			organizationalUnit.organization !== organization.guid
		) {
			throw new McpCreationError('Organization or organizational unit not found or inaccessible.');
		}
	}

	if ('category' in payloadResult.data) {
		const unknownCategory = await findUnknownCategory({
			category: payloadResult.data.category,
			loadContext: () => context.loadCategoryContext(input.payload.type)
		});
		if (unknownCategory) {
			throw new McpCreationError(unknownCategory);
		}
	}

	const candidate = containerOfType(
		input.payload.type,
		organizationalUnit ?? organization
	) as NewContainer;
	candidate.payload = payloadResult.data;
	// The container is appended after the children of each parent, including
	// those created before it in the same call.
	const plannedRelations = [...planned.values()].flatMap(({ relation }) => relation);
	const position = (parentGuid: string, predicate: string) =>
		nextPosition(
			[...(existing.get(parentGuid)?.relation ?? []), ...plannedRelations],
			parentGuid,
			predicate
		);
	// The first parent decides the permissions, so existing parents go first.
	candidate.relation = input.parentRelations
		.toSorted(
			(first, second) =>
				Number(pending.has(first.parentGuid)) - Number(pending.has(second.parentGuid))
		)
		.flatMap(({ parentGuid, predicate }) => {
			const relation = { object: parentGuid, position: position(parentGuid, predicate), predicate };
			if (predicate !== predicates.enum['is-part-of-program']) {
				return [relation];
			}
			const section = predicates.enum['is-section-of'];
			return [
				relation,
				{ object: parentGuid, position: position(parentGuid, section), predicate: section }
			];
		});

	// As in the web application, a measure below a measure is one level
	// deeper; the level is derived rather than taken from the payload.
	const parentMeasure = input.parentRelations
		.filter(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
		.map(({ parentGuid }) => parentsByGuid.get(parentGuid))
		.find(
			(parent): parent is Container<MeasurePayload> =>
				parent !== undefined && isMeasureContainer(parent)
		);
	if (parentMeasure && isMeasureContainer(candidate)) {
		const hierarchyLevel = parentMeasure.payload.hierarchyLevel + 1;
		if (hierarchyLevel > maxHierarchyLevel) {
			throw new McpCreationError(
				`Measures can be nested at most ${maxHierarchyLevel} levels deep.`
			);
		}
		candidate.payload.hierarchyLevel = hierarchyLevel;
	}

	return candidate;
}

export function createMcpContainer(input: CreateContainerInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<Container<AnyPayload>> =>
		runAsRequestUser(input.userId, async () => {
			const user = await loadMcpUserContext(connection, input.userId);
			return createMcpContainerAs(connection, user, input, createContainerToolName);
		});
}

// Checks the container against its organization and parents and creates it
// on behalf of the user, recording the write for the tool. Runs as the
// request user.
export async function createMcpContainerAs(
	connection: DatabaseConnection,
	user: User,
	input: McpContainerCreation & McpAuth,
	tool: string
): Promise<Container<AnyPayload>> {
	const organization = await findMcpOrganization(connection, user, input.organizationGuid);
	const existing = await findReferencedContainers(
		connection,
		user,
		organization,
		input.parentRelations.map(({ parentGuid }) => parentGuid)
	);
	const candidate = await planMcpContainer(
		{
			connection,
			existing,
			loadCategoryContext: (type) =>
				loadMcpCategoryContext({
					connection,
					organizationGuid: organization.guid,
					types: [type],
					user
				}),
			organization,
			pending: new Set(),
			planned: new Map(),
			user
		},
		input
	);

	return createAndRecordContainer({
		auth: input,
		data: candidate,
		tool,
		user
	})(connection);
}

// An indicator measures a new effect, or is the objective of a new
// objective, through these relations. attach_indicator links existing
// indicators, avoiding duplicates.
const indicatorLinks: Partial<Record<string, PayloadType>> = {
	[predicates.enum['is-measured-by']]: payloadTypes.enum.effect,
	[predicates.enum['is-objective-for']]: payloadTypes.enum.objective
};

const indicatorTypes: readonly PayloadType[] = [
	payloadTypes.enum.binary_indicator,
	payloadTypes.enum.indicator
];

function checkRelationOfNewContainer(
	context: McpCreationContext,
	subject: PlannedContainer,
	{ objectGuid, predicate }: CreateContainersInput['containers'][number]['relations'][number]
) {
	if (objectGuid === subject.guid) {
		throw new McpCreationError('A container cannot be related to itself.');
	}
	const object = context.pending.has(objectGuid)
		? context.planned.get(objectGuid)
		: context.existing.get(objectGuid);
	if (!object || !mcpPayloadTypes.safeParse(object.payload.type).success) {
		throw new McpCreationError('Related container not found or inaccessible.');
	}
	if ('template' in object.payload && object.payload.template === true) {
		throw new McpCreationError(
			'Containers marked as templates (template: true) cannot be related by this tool.'
		);
	}
	const linkedType = indicatorLinks[predicate];
	if (
		linkedType !== undefined &&
		(subject.payload.type !== linkedType ||
			!context.pending.has(objectGuid) ||
			!indicatorTypes.includes(object.payload.type))
	) {
		throw new McpCreationError(
			`${predicate} links a new ${linkedType} to an indicator or binary indicator created in the same call; to link an existing indicator, use attach_indicator.`
		);
	}
}

// Names the container of the call that a check failed for.
async function forContainer<T>(index: number, check: () => Promise<T> | T): Promise<T> {
	try {
		return await check();
	} catch (error) {
		if (error instanceof McpCreationError) {
			throw new McpCreationError(`containers[${index}]: ${error.message}`);
		}
		throw error;
	}
}

function mapBatchInsertError(error: unknown, guids: readonly string[]): never {
	if (
		error instanceof UniqueIntegrityConstraintViolationError &&
		error.constraint === 'container_guid_key'
	) {
		// PostgreSQL names the GUID in its detail: Key (guid)=(…) already exists.
		const detail = error.detail?.toLowerCase() ?? '';
		const index = guids.findIndex((guid) => detail.includes(guid.toLowerCase()));
		throw new McpCreationError(
			index === -1
				? 'A container with one of these GUIDs exists already; choose new GUIDs.'
				: `containers[${index}]: A container with the GUID ${guids[index]} exists already; choose a new GUID.`
		);
	}
	mapCreationError(error);
}

// Creates the containers of one call together, like the bulk creation of the
// web application: all of them or none. The agent chooses their GUIDs, so
// that they can refer to each other. Each container is checked like one
// created through create_container.
export function createMcpContainers(input: CreateContainersInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<CreateContainersOutput> =>
		runAsRequestUser(input.userId, async () => {
			const user = await loadMcpUserContext(connection, input.userId);
			const organization = await findMcpOrganization(connection, user, input.organizationGuid);
			const pending = new Set(input.containers.map(({ guid }) => guid));
			const existing = await findReferencedContainers(
				connection,
				user,
				organization,
				input.containers
					.flatMap(({ parentRelations, relations }) => [
						...parentRelations.map(({ parentGuid }) => parentGuid),
						...relations.map(({ objectGuid }) => objectGuid)
					])
					.filter((guid) => !pending.has(guid))
			);
			const planned = new Map<string, PlannedContainer>();
			const context: McpCreationContext = {
				connection,
				existing,
				loadCategoryContext: (type) =>
					loadMcpCategoryContext({
						connection,
						organizationGuid: organization.guid,
						types: [type],
						user
					}),
				organization,
				pending,
				planned,
				user
			};

			for (const [index, { guid, ...container }] of input.containers.entries()) {
				const candidate = await forContainer(index, () => planMcpContainer(context, container));
				planned.set(guid, markAsAiGenerated({ ...candidate, guid }));
			}
			// Relations may point to containers listed later.
			for (const [index, { guid, relations }] of input.containers.entries()) {
				const subject = planned.get(guid)!;
				for (const relation of relations) {
					await forContainer(index, () => checkRelationOfNewContainer(context, subject, relation));
					subject.relation.push({
						object: relation.objectGuid,
						position: 0,
						predicate: relation.predicate
					});
				}
			}

			let created: Container<AnyPayload>[];
			try {
				created = await createAuthorizedContainers({
					afterCreate: async (containers, txConnection) => {
						for (const container of containers) {
							await recordMcpWriteEvent({
								clientId: input.clientId,
								containerGuid: container.guid,
								revision: container.revision,
								tokenId: input.tokenId,
								tool: createContainersToolName,
								userId: input.userId
							})(txConnection);
						}
					},
					containers: input.containers.map(({ guid }) => planned.get(guid)!),
					features: getFeatures(),
					user
				})(connection);
			} catch (error) {
				mapBatchInsertError(
					error,
					input.containers.map(({ guid }) => guid)
				);
			}

			return {
				containers: created.map((container) => ({
					...summarizeContainer(container),
					revision: container.revision
				}))
			};
		});
}
