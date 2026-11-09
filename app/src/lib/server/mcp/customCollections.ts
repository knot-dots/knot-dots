import type { DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import {
	getPayloadSchema,
	isCustomCollectionContainer,
	payloadTypes,
	predicates,
	type AnyPayload,
	type Container,
	type CustomCollectionPayload,
	type PayloadType
} from '$lib/models';
import {
	organizationScopeAsFilter,
	organizationScopeFilterKeys,
	parseOrganizationScope,
	type CollectionFilter
} from '$lib/organizationScope';
import { getManyContainers } from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { findUnknownCategory, loadMcpCategoryContext } from '$lib/server/mcp/categories';
import {
	addCustomCollectionSectionToolName,
	updateCustomCollectionSectionToolName,
	type AddCustomCollectionSectionInput,
	type CustomCollectionSection,
	type CustomCollectionSectionOutput,
	type UpdateCustomCollectionSectionInput
} from '$lib/server/mcp/contracts/customCollections';
import {
	createMcpContainerAs,
	findVisibleContainer,
	McpCreationError,
	payloadValidationMessage
} from '$lib/server/mcp/creation';
import { conflict, McpUpdateError, writeMcpRevision } from '$lib/server/mcp/update';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';
import type { User } from '$lib/stores';

// Filters of the web application other than categories, type and
// organization scope. The tools leave them as they are.
const additionalFilterKeys: readonly string[] = ['indicatorCategory', 'programType', 'status'];

const nonCategoryFilterKeys: ReadonlySet<string> = new Set([
	'type',
	...organizationScopeFilterKeys,
	...additionalFilterKeys
]);

function pickFilter(filter: CollectionFilter, keep: (key: string) => boolean) {
	return Object.fromEntries(Object.entries(filter).filter(([key]) => keep(key)));
}

function categoriesOf(filter: CollectionFilter) {
	return pickFilter(filter, (key) => !nonCategoryFilterKeys.has(key));
}

function typesOf(filter: CollectionFilter) {
	return (filter.type ?? []).filter(
		(type): type is PayloadType => payloadTypes.safeParse(type).success
	);
}

function asSection(container: Container<AnyPayload>) {
	if (!isCustomCollectionContainer(container)) {
		throw new Error('Expected a custom collection.');
	}
	return { section: viewCustomCollectionSection(container) };
}

// The settings of the section as the tools take them, rather than the
// encoded filter of the payload.
export function viewCustomCollectionSection(
	container: Container<CustomCollectionPayload>
): CustomCollectionSection {
	const { payload } = container;
	return {
		additionalFilters: pickFilter(payload.filter, (key) => additionalFilterKeys.includes(key)),
		allowSearch: payload.allowSearch,
		allowSort: payload.allowSort,
		categories: categoriesOf(payload.filter),
		description: payload.description ?? null,
		guid: container.guid,
		items: payload.item,
		listType: payload.listType,
		// The web application shows the items instead of the filter if there are any.
		mode: payload.item.length > 0 ? 'items' : 'filter',
		// A filter without scope follows the current organization with its
		// units; with scope, the web application writes both keys.
		organizationScope: parseOrganizationScope({ organizationalUnit: [], ...payload.filter }),
		parentGuid:
			container.relation.find(
				({ object, predicate }) =>
					predicate === predicates.enum['is-section-of'] && object !== container.guid
			)?.object ?? null,
		revision: container.revision,
		showDescription: payload.showDescription,
		sort: payload.sort,
		title: payload.title,
		types: typesOf(payload.filter)
	};
}

// Returns the first item the user cannot read, if any.
async function findInaccessibleItem(connection: DatabaseConnection, user: User, items: string[]) {
	if (items.length === 0) {
		return undefined;
	}
	const ability = defineAbilityFor(user);
	const found = await getManyContainers([], { guid: items }, 'alpha')(connection);
	const visible = new Set(
		found.filter((container) => ability.can('read', container)).map(({ guid }) => guid)
	);
	return items.find((guid) => !visible.has(guid));
}

function definedSettings(settings: Record<string, unknown>) {
	return Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined));
}

// Appends a custom collection to the sections of its parent, created like
// any other section through create_container.
export function addMcpCustomCollectionSection(input: AddCustomCollectionSectionInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<CustomCollectionSectionOutput> =>
		runAsRequestUser(input.userId, async () => {
			const {
				categories = {},
				includeSubordinateOrganizationalUnits = true,
				items = [],
				parentGuid,
				tokenId,
				types,
				userId,
				...settings
			} = input;
			const user = await loadMcpUserContext(connection, userId);
			const parent = await findVisibleContainer(connection, user, parentGuid);
			if (!parent) {
				throw new McpCreationError('Parent container not found or inaccessible.');
			}

			if (types) {
				const unknownCategory = await findUnknownCategory({
					category: categories,
					loadContext: () =>
						loadMcpCategoryContext({
							connection,
							organizationGuid: parent.organization,
							types,
							user
						})
				});
				if (unknownCategory) {
					throw new McpCreationError(unknownCategory);
				}
			}
			const inaccessibleItem = await findInaccessibleItem(connection, user, items);
			if (inaccessibleItem) {
				throw new McpCreationError(`Item not found or inaccessible: ${inaccessibleItem}.`);
			}

			const created = await createMcpContainerAs(
				connection,
				user,
				{
					organizationGuid: parent.organization,
					organizationalUnitGuid: null,
					parentRelations: [{ parentGuid, predicate: predicates.enum['is-section-of'] }],
					payload: {
						...definedSettings(settings),
						filter: types
							? {
									type: types,
									...categories,
									...organizationScopeAsFilter({
										includeSubordinateOrganizationalUnits,
										type: 'current'
									})
								}
							: {},
						item: items,
						type: payloadTypes.enum.custom_collection
					},
					tokenId,
					userId
				},
				addCustomCollectionSectionToolName
			);
			return asSection(created);
		});
}

// Changes the given settings of a custom collection section and keeps the
// others, including filters these tools do not know.
export function updateMcpCustomCollectionSection(
	input: UpdateCustomCollectionSectionInput & McpAuth
) {
	return (connection: DatabaseConnection): Promise<CustomCollectionSectionOutput> =>
		runAsRequestUser(input.userId, async () => {
			const {
				categories,
				expectedRevision,
				guid,
				includeSubordinateOrganizationalUnits,
				items,
				tokenId,
				types,
				userId,
				...settings
			} = input;
			const user = await loadMcpUserContext(connection, userId);
			const current = await findVisibleContainer(connection, user, guid);
			if (!current || !isCustomCollectionContainer(current)) {
				throw new McpUpdateError('Custom collection section not found or inaccessible.');
			}
			if (current.revision !== expectedRevision) {
				throw conflict(expectedRevision);
			}

			const { filter } = current.payload;
			if (categories) {
				const unknownCategory = await findUnknownCategory({
					category: categories,
					loadContext: () =>
						loadMcpCategoryContext({
							connection,
							organizationGuid: current.organization,
							types: types ?? typesOf(filter),
							user
						}),
					previous: categoriesOf(filter)
				});
				if (unknownCategory) {
					throw new McpUpdateError(unknownCategory);
				}
			}
			const inaccessibleItem = await findInaccessibleItem(connection, user, items ?? []);
			if (inaccessibleItem) {
				throw new McpUpdateError(`Item not found or inaccessible: ${inaccessibleItem}.`);
			}

			const payloadResult = getPayloadSchema(payloadTypes.enum.custom_collection).safeParse({
				...current.payload,
				...definedSettings(settings),
				filter: {
					...(categories ? pickFilter(filter, (key) => nonCategoryFilterKeys.has(key)) : filter),
					...categories,
					...(types ? { type: types } : {}),
					...(includeSubordinateOrganizationalUnits === undefined
						? {}
						: organizationScopeAsFilter({
								includeSubordinateOrganizationalUnits,
								type: 'current'
							}))
				},
				// Filter settings switch the collection back to its filter.
				...(items
					? { item: items }
					: types || categories || includeSubordinateOrganizationalUnits !== undefined
						? { item: [] }
						: {})
			});
			if (!payloadResult.success) {
				throw new McpUpdateError(payloadValidationMessage(payloadResult.error));
			}

			const updated = await writeMcpRevision({
				auth: { tokenId, userId },
				current,
				payload: payloadResult.data,
				tool: updateCustomCollectionSectionToolName,
				user
			})(connection);
			return asSection(updated);
		});
}
