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
	objectTypesPerKey: Record<string, string[]>;
};

type Connect = <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;

type Scope = string[];

export async function loadCategoryContext(params: {
	connect: Connect;
	scope: Scope;
	user: User;
}): Promise<CategoryContext | undefined> {
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

	if (keys.length > 0) {
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
}

export function filterCategoryContext(
	context: CategoryContext,
	objectTypes: string[],
	options?: { matchAll?: boolean }
): CategoryContext {
	if (objectTypes.length === 0) return context;

	const allowedTypes = new Set(objectTypes);

	const filteredKeys = context.keys.filter((key) => {
		const configured = context.objectTypesPerKey[key] ?? [];
		if (configured.length === 0) return true;
		if (options?.matchAll) {
			return [...allowedTypes].every((type) => configured.includes(type));
		}
		return configured.some((type) => allowedTypes.has(type));
	});

	const filteredOptions: CategoryOptions = {};
	for (const key of filteredKeys) {
		if (context.options[key]) {
			filteredOptions[key] = context.options[key];
		}
	}
	if (context.options.__categoryLabels__) {
		filteredOptions.__categoryLabels__ = context.options.__categoryLabels__;
	}

	return {
		options: filteredOptions,
		labels: buildCategoryLabels(filteredOptions),
		keys: filteredKeys,
		objectTypesPerKey: context.objectTypesPerKey
	};
}

export function buildCategoryFacetsWithCounts(
	options: CategoryOptions,
	counts: Record<string, Record<string, number>> = {}
) {
	return buildCategoryFacets(options, counts);
}
