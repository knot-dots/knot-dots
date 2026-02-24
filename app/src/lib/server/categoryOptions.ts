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

async function fetchOptionsForScope(params: { connect: Connect; scope: Scope; user: User }) {
	const { connect, scope, user } = params;
	const [categories, terms] = await Promise.all([
		connect(getManyContainers(scope, { type: [payloadTypes.enum.category] }, 'alpha')),
		connect(getManyContainers(scope, { type: [payloadTypes.enum.term] }, 'alpha'))
	]);

	const visibleCategories = filterVisible(categories, user).filter(isCategoryContainer);
	const visibleTerms = filterVisible(terms, user).filter(isTermContainer);

	const options = buildCategoryOptionsFromContainers(visibleCategories, visibleTerms);
	const keys = getCategoryKeys(options);

	return keys.length > 0 ? { options, keys } : null;
}

export async function loadCategoryContext(params: {
	connect: Connect;
	scope: Scope;
	user: User;
}): Promise<CategoryContext | null> {
	const result = await fetchOptionsForScope({
		connect: params.connect,
		scope: params.scope,
		user: params.user
	});
	if (result) {
		return {
			options: result.options,
			labels: buildCategoryLabels(result.options),
			keys: result.keys
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
