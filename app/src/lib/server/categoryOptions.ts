import { filterVisible } from '$lib/authorization';
import {
	buildCategoryFacets,
	buildCategoryLabels,
	buildCategoryOptionsFromContainers,
	type CategoryOptions,
	getCategoryKeys
} from '$lib/categoryOptions';
import { isCategoryContainer, isTermContainer, payloadTypes } from '$lib/models';
import type { User } from '$lib/stores';
import { getManyContainers } from '$lib/server/db';
import type { DatabaseConnection } from 'slonik';

export type CategoryContext = {
	options: CategoryOptions;
	labels: Map<string, string>;
	keys: string[];
};

type Connect = <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;

type Scope = string[];

export async function loadCategoryContext(params: {
	connect: Connect;
	scope: Scope;
	user: User;
}): Promise<CategoryContext | null> {
	const containers = await params.connect(
		getManyContainers(
			params.scope,
			{ type: [payloadTypes.enum.category, payloadTypes.enum.term] },
			'alpha'
		)
	);

	const options = buildCategoryOptionsFromContainers(
		filterVisible(containers.filter(isCategoryContainer), params.user),
		filterVisible(containers.filter(isTermContainer), params.user)
	);
	const keys = getCategoryKeys(options);

	if (keys.length > 0) {
		return {
			options: options,
			labels: buildCategoryLabels(options),
			keys: keys
		};
	}

	return null;
}

export function buildCategoryFacetsWithCounts(
	options: CategoryOptions,
	counts: Record<string, Record<string, number>> = {}
) {
	return buildCategoryFacets(options, counts);
}
