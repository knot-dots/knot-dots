import { filterVisible } from '$lib/authorization';
import {
	buildCategoryFacets,
	buildCategoryLabels,
	buildCategoryOptionsFromContainers,
	getCategoryKeys,
	type CategoryOptions
} from '$lib/categoryOptions';
import {
	isCategoryContainer,
	isTermContainer,
	payloadTypes,
	type CategoryContainer
} from '$lib/models';
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

function dedupe(values: Scope) {
	return Array.from(new Set(values.filter(Boolean)));
}

function normalize(values: unknown): string[] {
	if (Array.isArray(values)) {
		return values.filter((v): v is string => typeof v === 'string' && v.length > 0);
	}
	if (typeof values === 'string' && values.length > 0) {
		return [values];
	}
	return [];
}

function categoryMatchesObjectTypes(category: CategoryContainer, allowed: Iterable<string>) {
	const allowedSet = new Set(normalize(Array.from(allowed)));
	if (allowedSet.size === 0) return true;

	const configured = normalize((category.payload as Record<string, unknown>).objectTypes);
	if (configured.length === 0) return true;

	return configured.some((type) => allowedSet.has(type));
}

async function fetchOptionsForScope(params: {
	connect: Connect;
	scope: Scope;
	user: User;
	objectTypes?: unknown;
}) {
	const { connect, scope, user, objectTypes } = params;
	const [categories, terms] = await Promise.all([
		connect(getManyContainers(scope, { type: [payloadTypes.enum.category] }, 'alpha')),
		connect(getManyContainers(scope, { type: [payloadTypes.enum.term] }, 'alpha'))
	]);

	const allowedTypes = new Set(normalize(objectTypes));
	const visibleCategories = filterVisible(categories, user)
		.filter(isCategoryContainer)
		.filter((category) => categoryMatchesObjectTypes(category, allowedTypes));
	const visibleTerms = filterVisible(terms, user).filter(isTermContainer);

	const options = buildCategoryOptionsFromContainers(visibleCategories, visibleTerms);
	const keys = getCategoryKeys(options);

	return keys.length > 0 ? { options, keys } : null;
}

export async function loadCategoryContext(params: {
	connect: Connect;
	organizationScope: Scope;
	fallbackScope?: Scope;
	user: User;
	objectTypes?: unknown;
}): Promise<CategoryContext | null> {
	const scopes = [dedupe(params.organizationScope), dedupe(params.fallbackScope ?? [])].filter(
		(scope) => scope.length > 0
	);

	for (const scope of scopes) {
		const result = await fetchOptionsForScope({
			connect: params.connect,
			scope,
			user: params.user,
			objectTypes: params.objectTypes
		});
		if (result) {
			return {
				options: result.options,
				labels: buildCategoryLabels(result.options),
				keys: result.keys
			};
		}
	}

	return null;
}

export function buildCategoryFacetsWithCounts(
	options: CategoryOptions,
	counts: Record<string, Record<string, number>> = {}
) {
	return buildCategoryFacets(options, counts);
}
