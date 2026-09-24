import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	buildCategoryLabels,
	buildCategoryOptionsFromContainers,
	type CategoryContext,
	getCategoryKeys
} from '$lib/categoryOptions';
import { isCategoryContainer, isTermContainer, payloadTypes } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { User } from '$lib/stores';

type Connect = <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;

type Scope = string[];

export async function loadCategoryContext(params: {
	connect: Connect;
	scope: Scope;
	user: User;
}): Promise<CategoryContext> {
	const containers = await params.connect(
		getManyContainers(
			params.scope,
			{ type: [payloadTypes.enum.category, payloadTypes.enum.term] },
			'alpha'
		)
	);

	const categories = filterVisible(containers.filter(isCategoryContainer), params.user);

	const options = buildCategoryOptionsFromContainers(
		categories,
		filterVisible(containers.filter(isTermContainer), params.user)
	);
	const keys = getCategoryKeys(categories);

	const objectTypesPerKey: Record<string, string[]> = {};
	for (const category of categories) {
		objectTypesPerKey[category.guid] = category.payload.objectTypes ?? [];
	}

	return {
		options,
		labels: buildCategoryLabels(categories),
		keys,
		objectTypesPerKey
	};
}
