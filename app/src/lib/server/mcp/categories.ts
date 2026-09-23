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
	return async (connection: DatabaseConnection): Promise<ListContainerCategoriesOutput> => {
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
	};
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
	return async (connection: DatabaseConnection): Promise<ListContainerCategoryValuesOutput> => {
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
	};
}
