import type { DatabaseConnection } from 'slonik';
import {
	filterCategoryContext,
	type CategoryContext,
	type CategoryOption
} from '$lib/categoryOptions';
import { categoryObjectTypes, type PayloadType } from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import { getManyOrganizationContainers } from '$lib/server/db';
import type {
	ListContainerCategoriesInput,
	ListContainerCategoriesOutput,
	ListContainerCategoryValuesInput,
	ListContainerCategoryValuesOutput
} from '$lib/server/mcp/contracts/categories';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';
import type { User } from '$lib/stores';

function flattenCategoryValues(
	options: CategoryOption[],
	parentValue: string | null = null
): ListContainerCategoryValuesOutput['values'] {
	return options.flatMap(({ label, subOptions = [], value }) => [
		{ label, parentValue, value },
		...flattenCategoryValues(subOptions, value)
	]);
}

export async function loadMcpCategoryContext({
	connection,
	organizationGuid,
	types,
	user
}: {
	connection: DatabaseConnection;
	organizationGuid: string;
	types: PayloadType[];
	user: User;
}): Promise<CategoryContext> {
	const defaultOrganizations = await getManyOrganizationContainers(
		{ default: true },
		''
	)(connection);
	const scope = [organizationGuid, ...defaultOrganizations.map(({ guid }) => guid)].filter(
		(guid, index, values) => values.indexOf(guid) === index
	);
	const context = await loadCategoryContext({
		connect: async (operation) => operation(connection),
		scope,
		user
	});

	return types.length > 0 ? filterCategoryContext(context, types) : context;
}

// All values of each category key, including sub-values.
export function categoryValuesByKey(context: CategoryContext) {
	return new Map(
		context.keys.map((key) => {
			const values = new Set<string>();
			const collect = (options: CategoryOption[]) => {
				for (const option of options) {
					values.add(option.value);
					collect(option.subOptions ?? []);
				}
			};
			collect(context.options[key] ?? []);
			return [key, values] as const;
		})
	);
}

// Returns a message naming the first category key or value that the
// organization does not offer, or null if all are known. Values already
// stored in previous are accepted, so that values the organization no longer
// offers do not block unrelated changes. The category context is only loaded
// if there is something to check.
export async function findUnknownCategory({
	category,
	loadContext,
	previous = {}
}: {
	category: Record<string, string[]>;
	loadContext: () => Promise<CategoryContext>;
	previous?: Record<string, string[]>;
}): Promise<string | null> {
	const added = Object.entries(category)
		.map(([key, values]) => [key, values.filter((v) => !previous[key]?.includes(v))] as const)
		.filter(([, values]) => values.length > 0);
	if (added.length === 0) {
		return null;
	}

	const valuesByKey = categoryValuesByKey(await loadContext());
	for (const [key, values] of added) {
		const known = valuesByKey.get(key);
		if (!known) {
			return `Unknown category: ${key}. Use list_container_categories to find the categories of this type.`;
		}
		const unknown = values.find((value) => !known.has(value));
		if (unknown !== undefined) {
			return `Unknown value of category ${key}: ${unknown}. Use list_container_category_values to find its values.`;
		}
	}
	return null;
}

export class McpCategoryError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpCategoryError';
	}
}

export function listMcpContainerCategories({
	organizationGuid,
	types,
	userId
}: ListContainerCategoriesInput & { userId: string }) {
	return (connection: DatabaseConnection): Promise<ListContainerCategoriesOutput> =>
		runAsRequestUser(userId, async () => {
			const user = await loadMcpUserContext(connection, userId);
			const context = await loadMcpCategoryContext({ connection, organizationGuid, types, user });

			return {
				categories: context.keys.map((key) => ({
					applicableTypes: categoryObjectTypes.array().parse(context.objectTypesPerKey[key] ?? []),
					key,
					label: context.labels.get(key) ?? key,
					valueCount: flattenCategoryValues(context.options[key] ?? []).length
				}))
			};
		});
}

export function listMcpContainerCategoryValues({
	categoryKey,
	limit,
	offset,
	organizationGuid,
	terms,
	types,
	userId
}: ListContainerCategoryValuesInput & { userId: string }) {
	return (connection: DatabaseConnection): Promise<ListContainerCategoryValuesOutput> =>
		runAsRequestUser(userId, async () => {
			const user = await loadMcpUserContext(connection, userId);
			const context = await loadMcpCategoryContext({ connection, organizationGuid, types, user });
			if (!context.keys.includes(categoryKey)) {
				throw new McpCategoryError('Category not found or unavailable for the selected types.');
			}

			const normalizedTerms = terms?.toLocaleLowerCase();
			const matchingValues = flattenCategoryValues(context.options[categoryKey] ?? []).filter(
				({ label, value }) =>
					!normalizedTerms ||
					label.toLocaleLowerCase().includes(normalizedTerms) ||
					value.toLocaleLowerCase().includes(normalizedTerms)
			);
			const values = matchingValues.slice(offset, offset + limit);

			return {
				category: { key: categoryKey, label: context.labels.get(categoryKey) ?? categoryKey },
				nextOffset: offset + values.length < matchingValues.length ? offset + values.length : null,
				values
			};
		});
}
