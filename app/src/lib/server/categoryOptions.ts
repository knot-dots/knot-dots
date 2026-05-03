import { filterVisible } from '$lib/authorization';
import {
	buildCategoryLabels,
	buildCategoryOptionsFromContainers,
	type CategoryContext,
	getCategoryKeys
} from '$lib/categoryOptions';
import { isCategoryContainer, isTermContainer, payloadTypes } from '$lib/models';
import type { User } from '$lib/stores';
import { getManyContainers } from '$lib/server/db';
import type { DatabaseConnection } from 'slonik';

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
	const keys = getCategoryKeys(options);

	const objectTypesPerKey: Record<string, string[]> = {};
	for (const category of categories) {
		const key = category.payload.key;
		if (key) {
			objectTypesPerKey[key] = category.payload.objectTypes ?? [];
		}
	}

	return {
		options,
		labels: buildCategoryLabels(options),
		keys,
		objectTypesPerKey
	};
}
