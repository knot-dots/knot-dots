import { NotFoundError, type DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import { getFeatures } from '$lib/server/features';
import {
	containerOfType,
	getPayloadSchema,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	isPageContainer,
	isProgramContainer,
	payloadTypes,
	predicates,
	type PayloadType,
	type AnyPayload,
	type Container,
	type CustomCollectionPayload,
	type NewContainer
} from '$lib/models';
import { organizationScopeAsFilter } from '$lib/organizationScope';
import { isMeasureTemplateScope } from '$lib/templateScopes';
import { ContainerCreationError, createAuthorizedContainer } from '$lib/server/containerCreation';
import {
	getAllDirectContainerRelations,
	getContainerByGuid,
	getManyContainers,
	recordMcpWriteEvent
} from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { loadMcpCategoryContext } from '$lib/server/mcp/categories';
import {
	addCustomCollectionSectionToolName,
	createContainerToolName,
	type McpParentRelationPredicate,
	type AddCustomCollectionSectionInput,
	type AddCustomCollectionSectionOutput,
	type CreateContainerInput
} from '$lib/server/mcp/contracts/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';
import type { User } from '$lib/stores';

export class McpCreationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpCreationError';
	}
}

async function findVisibleContainer(
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

function payloadValidationMessage(error: {
	issues: Array<{ message: string; path: PropertyKey[] }>;
}) {
	return error.issues
		.map(
			({ message, path }) =>
				`${path.length > 0 ? `payload.${path.join('.')}` : 'payload'}: ${message}`
		)
		.join('; ');
}

function createAndRecordContainer({
	auth: { tokenId, userId },
	data,
	tool,
	user
}: {
	auth: McpAuth;
	data: NewContainer;
	tool: string;
	user: User;
}) {
	return async (connection: DatabaseConnection): Promise<Container<AnyPayload>> => {
		try {
			return await createAuthorizedContainer({
				afterCreate: (created, txConnection) =>
					recordMcpWriteEvent({
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
	[payloadTypes.enum.goal]: [payloadTypes.enum.goal],
	[payloadTypes.enum.knowledge]: [payloadTypes.enum.knowledge],
	[payloadTypes.enum.measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
	[payloadTypes.enum.simple_measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
	[payloadTypes.enum.task]: [payloadTypes.enum.goal, payloadTypes.enum.measure]
};

// Structural relations drive hierarchy, grants and ownership, so the parent
// must be of a type the relation is meant for.
function isValidParent(
	type: PayloadType,
	predicate: McpParentRelationPredicate,
	parent: Container<AnyPayload>
) {
	switch (predicate) {
		case predicates.enum['is-part-of-program']:
			return isProgramContainer(parent);
		case predicates.enum['is-part-of-measure']:
			return isMeasureTemplateScope(parent);
		case predicates.enum['is-part-of']:
			return isPartOfParentTypes[type]?.includes(parent.payload.type) ?? false;
	}
}

export function createMcpContainer(input: CreateContainerInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<Container<AnyPayload>> =>
		runAsRequestUser(input.userId, async () => {
			const user = await loadMcpUserContext(connection, input.userId);
			const organization = await findVisibleContainer(connection, user, input.organizationGuid);
			if (!organization || !isOrganizationContainer(organization)) {
				throw new McpCreationError(
					'Organization or organizational unit not found or inaccessible.'
				);
			}

			const payloadResult = getPayloadSchema(input.payload.type).safeParse(input.payload);
			if (!payloadResult.success) {
				throw new McpCreationError(payloadValidationMessage(payloadResult.error));
			}
			if ('template' in payloadResult.data && payloadResult.data.template === true) {
				throw new McpCreationError('Template creation is not supported by this tool.');
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
			const organizationalUnitGuid =
				parents.length > 0 ? parentUnits[0] : input.organizationalUnitGuid;

			let organizationalUnit: Container<AnyPayload> | null = null;
			if (organizationalUnitGuid) {
				organizationalUnit = await findVisibleContainer(connection, user, organizationalUnitGuid);
				if (
					!organizationalUnit ||
					!isOrganizationalUnitContainer(organizationalUnit) ||
					organizationalUnit.organization !== organization.guid
				) {
					throw new McpCreationError(
						'Organization or organizational unit not found or inaccessible.'
					);
				}
			}

			const candidate = containerOfType(
				input.payload.type,
				organizationalUnit ?? organization
			) as NewContainer;
			candidate.payload = payloadResult.data;
			candidate.relation = input.parentRelations.map(({ parentGuid, predicate }) => {
				const parent = parentsByGuid.get(parentGuid);
				if (!parent) throw new McpCreationError('Parent container not found or inaccessible.');
				const position =
					Math.max(
						-1,
						...parent.relation
							.filter(
								(relation) => relation.object === parentGuid && relation.predicate === predicate
							)
							.map(({ position }) => position)
					) + 1;
				return { object: parentGuid, position, predicate };
			});

			return createAndRecordContainer({
				auth: input,
				data: candidate,
				tool: createContainerToolName,
				user
			})(connection);
		});
}

function categoryValues(context: Awaited<ReturnType<typeof loadMcpCategoryContext>>) {
	return new Map(
		context.keys.map((key) => {
			const values = new Set<string>();
			const collect = (options: (typeof context.options)[string]) => {
				for (const option of options ?? []) {
					values.add(option.value);
					collect(option.subOptions ?? []);
				}
			};
			collect(context.options[key]);
			return [key, values] as const;
		})
	);
}

export function addMcpCustomCollectionSection(input: AddCustomCollectionSectionInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<AddCustomCollectionSectionOutput> =>
		runAsRequestUser(input.userId, async () => {
			const user = await loadMcpUserContext(connection, input.userId);
			const page = await findVisibleContainer(connection, user, input.pageGuid);
			const ability = defineAbilityFor(user);
			if (!page || !isPageContainer(page) || ability.cannot('update', page)) {
				throw new McpCreationError('Page not found or inaccessible.');
			}

			const categoryContext = await loadMcpCategoryContext({
				connection,
				organizationGuid: page.organization,
				types: input.types,
				user
			});
			const allowedCategories = categoryValues(categoryContext);
			for (const [key, values] of Object.entries(input.categories)) {
				const allowedValues = allowedCategories.get(key);
				if (!allowedValues || values.some((value) => !allowedValues.has(value))) {
					throw new McpCreationError(`Unknown category or category value: ${key}`);
				}
			}

			const relations = await getAllDirectContainerRelations(page.guid)(connection);
			const position =
				Math.max(
					-1,
					...relations
						.filter(
							({ object, predicate }) =>
								object === page.guid && predicate === predicates.enum['is-section-of']
						)
						.map(({ position }) => position)
				) + 1;
			const section = containerOfType(
				payloadTypes.enum.custom_collection,
				page
			) as NewContainer<CustomCollectionPayload>;
			section.payload.title = input.title;
			section.payload.item = [];
			section.payload.filter = {
				type: input.types,
				...input.categories,
				...organizationScopeAsFilter({
					includeSubordinateOrganizationalUnits: input.includeSubordinateOrganizationalUnits,
					type: 'current'
				})
			};
			section.relation = [
				{
					object: page.guid,
					position,
					predicate: predicates.enum['is-section-of']
				}
			];

			const created = await createAndRecordContainer({
				auth: input,
				data: section,
				tool: addCustomCollectionSectionToolName,
				user
			})(connection);

			return {
				section: {
					categories: input.categories,
					guid: created.guid,
					includeSubordinateOrganizationalUnits: input.includeSubordinateOrganizationalUnits,
					pageGuid: page.guid,
					title: input.title,
					types: input.types
				}
			};
		});
}
