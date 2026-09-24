import { NotFoundError, type DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import { getFeatures } from '$lib/server/features';
import {
	containerOfType,
	getPayloadSchema,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	isPageContainer,
	payloadTypes,
	predicates,
	type AnyPayload,
	type Container,
	type CustomCollectionPayload,
	type NewContainer
} from '$lib/models';
import { organizationScopeAsFilter } from '$lib/organizationScope';
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
	type AddCustomCollectionSectionInput,
	type AddCustomCollectionSectionOutput,
	type CreateContainerInput
} from '$lib/server/mcp/contracts/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
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

export function createMcpContainer(input: CreateContainerInput & McpAuth) {
	return async (connection: DatabaseConnection): Promise<Container<AnyPayload>> => {
		const user = await loadMcpUserContext(connection, input.userId);
		const organization = await findVisibleContainer(connection, user, input.organizationGuid);
		if (!organization || !isOrganizationContainer(organization)) {
			throw new McpCreationError('Organization or organizational unit not found or inaccessible.');
		}

		let organizationalUnit: Container<AnyPayload> | null = null;
		if (input.organizationalUnitGuid) {
			organizationalUnit = await findVisibleContainer(
				connection,
				user,
				input.organizationalUnitGuid
			);
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

		const candidate = containerOfType(
			input.payload.type,
			organization.guid,
			organizationalUnit?.guid ?? null,
			organizationalUnit?.guid ?? organization.guid,
			organization.realm
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
	};
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
	return async (connection: DatabaseConnection): Promise<AddCustomCollectionSectionOutput> => {
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
			page.organization,
			page.organizational_unit,
			page.managed_by,
			page.realm
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
	};
}
