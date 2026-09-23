import { NotFoundError, type DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import { getFeatures } from '$lib/server/features';
import {
	containerOfType,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	isPageContainer,
	payloadTypes,
	predicates,
	type AnyPayload,
	type Container,
	type CustomCollectionPayload,
	type NewContainer,
	type PagePayload
} from '$lib/models';
import { organizationScopeAsFilter } from '$lib/organizationScope';
import { ContainerCreationError, createAuthorizedContainer } from '$lib/server/containerCreation';
import { getAllDirectContainerRelations, getContainerByGuid } from '$lib/server/db';
import { loadMcpCategoryContext } from '$lib/server/mcp/categories';
import type {
	AddCustomCollectionSectionInput,
	AddCustomCollectionSectionOutput,
	CreatePageInput,
	CreatePageOutput
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
	if (error instanceof ContainerCreationError && error.kind === 'forbidden') {
		throw new McpCreationError('You are not allowed to create content in this context.');
	}
	throw error;
}

export function createMcpPage(input: CreatePageInput & { userId: string }) {
	return async (connection: DatabaseConnection): Promise<CreatePageOutput> => {
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

		const page = containerOfType(
			payloadTypes.enum.page,
			organization.guid,
			organizationalUnit?.guid ?? null,
			organizationalUnit?.guid ?? organization.guid,
			organization.realm
		) as NewContainer<PagePayload>;
		page.payload.body = input.body;
		page.payload.title = input.title;
		page.payload.visibility = input.visibility;

		let created: Container<AnyPayload>;
		try {
			created = await createAuthorizedContainer({ data: page, features: getFeatures(), user })(
				connection
			);
		} catch (error) {
			mapCreationError(error);
		}

		return {
			page: {
				guid: created.guid,
				organizationGuid: created.organization,
				organizationalUnitGuid: created.organizational_unit,
				title: input.title,
				visibility: input.visibility
			}
		};
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

export function addMcpCustomCollectionSection(
	input: AddCustomCollectionSectionInput & { userId: string }
) {
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

		let created: Container<AnyPayload>;
		try {
			created = await createAuthorizedContainer({ data: section, features: getFeatures(), user })(
				connection
			);
		} catch (error) {
			mapCreationError(error);
		}

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
