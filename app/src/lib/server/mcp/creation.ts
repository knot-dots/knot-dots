import { NotFoundError, type DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import { getFeatures } from '$lib/server/features';
import {
	containerOfType,
	getPayloadSchema,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	isMeasureContainer,
	isProgramContainer,
	mayHaveStructuralParent,
	payloadTypes,
	predicates,
	type PayloadType,
	type AnyPayload,
	type Container,
	type MeasurePayload,
	type NewContainer
} from '$lib/models';
import { isMeasureTemplateScope } from '$lib/templateScopes';
import { ContainerCreationError, createAuthorizedContainer } from '$lib/server/containerCreation';
import { getContainerByGuid, getManyContainers, recordMcpWriteEvent } from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { findUnknownCategory, loadMcpCategoryContext } from '$lib/server/mcp/categories';
import {
	createContainerToolName,
	mcpSectionParentTypes,
	type McpParentRelationPredicate,
	type CreateContainerInput
} from '$lib/server/mcp/contracts/creation';
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
		if (error.kind === 'forbidden') {
			throw new McpCreationError('You are not allowed to create content in this context.');
		}
		throw new McpCreationError('The container could not be created with the supplied data.');
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
	// Content created through MCP is written by an AI agent, so it is marked as
	// AI-generated like the containers extracted by the AI endpoints, whatever
	// the payload says.
	if ('aiContribution' in data.payload) {
		data.payload.aiContribution = 1;
	}

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

// The position after the existing children of the parent.
function nextPosition(
	relations: ReadonlyArray<{ object: string; position: number; predicate: string }>,
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
	parent: Container<AnyPayload>
) {
	if (!mayHaveStructuralParent(type)) {
		return false;
	}
	switch (predicate) {
		case predicates.enum['is-part-of-program']:
			return isProgramContainer(parent) && programPartTypes.includes(type);
		case predicates.enum['is-part-of-measure']:
			return isMeasureTemplateScope(parent);
		case predicates.enum['is-part-of']:
			return isPartOfParentTypes[type]?.includes(parent.payload.type) ?? false;
		case predicates.enum['is-section-of']:
			return sectionTypes.includes(type) && sectionParentTypes.includes(parent.payload.type);
	}
}

// The input of create_container for any payload type, so that the tools for
// types without a payload schema resource create containers the same way.
export type McpContainerCreation = Omit<CreateContainerInput, 'payload'> & {
	payload: { type: PayloadType } & Record<string, unknown>;
};

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
	const organization = await findVisibleContainer(connection, user, input.organizationGuid);
	if (!organization || !isOrganizationContainer(organization)) {
		throw new McpCreationError('Organization or organizational unit not found or inaccessible.');
	}

	const payloadResult = getPayloadSchema(input.payload.type).safeParse(input.payload);
	if (!payloadResult.success) {
		throw new McpCreationError(payloadValidationMessage(payloadResult.error));
	}
	if ('template' in payloadResult.data && payloadResult.data.template === true) {
		throw new McpCreationError(
			'Containers marked as templates (template: true) cannot be created by this tool.'
		);
	}

	const parentGuids = [...new Set(input.parentRelations.map(({ parentGuid }) => parentGuid))];
	const parents =
		parentGuids.length > 0
			? await getManyContainers([], { guid: parentGuids }, 'alpha')(connection)
			: [];
	const ability = defineAbilityFor(user);
	if (
		parents.length !== parentGuids.length ||
		parents.some(
			(parent) => parent.organization !== organization.guid || ability.cannot('read', parent)
		)
	) {
		throw new McpCreationError('Parent container not found or inaccessible.');
	}
	const parentsByGuid = new Map(parents.map((parent) => [parent.guid, parent]));
	for (const { parentGuid, predicate } of input.parentRelations) {
		const parent = parentsByGuid.get(parentGuid);
		if (parent && !isValidParent(input.payload.type, predicate, parent)) {
			throw new McpCreationError(
				`A ${parent.payload.type} cannot be the ${predicate} parent of a ${input.payload.type}.`
			);
		}
	}

	// Like a container created within its parents in the web application,
	// the container belongs to the organizational unit of its parents,
	// whose grants authorize the creation.
	const parentUnits = [...new Set(parents.map((parent) => parent.organizational_unit))];
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
			loadContext: () =>
				loadMcpCategoryContext({
					connection,
					organizationGuid: organization.guid,
					types: [input.payload.type],
					user
				})
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
	candidate.relation = input.parentRelations.flatMap(({ parentGuid, predicate }) => {
		const parent = parentsByGuid.get(parentGuid);
		if (!parent) throw new McpCreationError('Parent container not found or inaccessible.');
		const relation = {
			object: parentGuid,
			position: nextPosition(parent.relation, parentGuid, predicate),
			predicate
		};
		if (predicate !== predicates.enum['is-part-of-program']) {
			return [relation];
		}
		const section = predicates.enum['is-section-of'];
		return [
			relation,
			{
				object: parentGuid,
				position: nextPosition(parent.relation, parentGuid, section),
				predicate: section
			}
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

	return createAndRecordContainer({
		auth: input,
		data: candidate,
		tool,
		user
	})(connection);
}
