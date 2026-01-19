import fetchContainers from '$lib/client/fetchContainers';
import {
	isCategoryContainer,
	isTermContainer,
	payloadTypes,
	predicates,
	type CategoryContainer,
	type TermContainer
} from '$lib/models';

export type CategoryOption = { label: string; value: string; guid: string };

export type CategoryOptions = Record<string, CategoryOption[]> & {
	__categoryLabels__?: Record<string, string>;
};

export function buildCategoryFacets(options: CategoryOptions) {
	const result = new Map<string, Map<string, number>>();
	for (const [rawKey, list] of Object.entries(options)) {
		if (rawKey === '__categoryLabels__') continue;
		if (!Array.isArray(list)) continue;
		const entries = new Map<string, number>();
		for (const { value } of list) {
			entries.set(value, 0);
		}
		result.set(rawKey, entries);
	}
	return result;
}

export function buildCategoryLabels(options: CategoryOptions) {
	const labels = new Map<string, string>();

	for (const [facetKey, label] of Object.entries(options['__categoryLabels__'] ?? {})) {
		labels.set(facetKey, label);
	}

	for (const list of Object.values(options)) {
		if (!Array.isArray(list)) continue;
		for (const { value, label, guid } of list) {
			const resolved = label ?? value;
			labels.set(value, resolved);
			if (guid) labels.set(guid, resolved);
		}
	}

	return labels;
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

const cache = new Map<string, Promise<CategoryOptions>>();

function toCacheKey(categoryKeys: string[], organizationScope: string[]) {
	const scopeKey = Array.from(new Set(normalize(organizationScope))).sort().join(',');
	const categoriesKey = Array.from(new Set(normalize(categoryKeys))).sort().join(',');
	return `${scopeKey}|${categoriesKey}`;
}

function sortOptions(options: CategoryOption[]) {
	return options.toSorted((a, b) =>
		a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
	);
}

function findTermsForCategory(category: CategoryContainer, terms: TermContainer[]) {
	return terms.filter(({ relation }) =>
		relation?.some(
			({ object, predicate }) =>
				object === category.guid && predicate === predicates.enum['is-part-of-category']
		)
	);
}

export async function loadCategoryOptions(
	categoryKeys: unknown,
	organizationScope: unknown
): Promise<CategoryOptions> {
	const normalizedCategories = normalize(categoryKeys);
	const normalizedScope = normalize(organizationScope);
	const cacheKey = toCacheKey(normalizedCategories, normalizedScope);

	if (!cache.has(cacheKey)) {
		cache.set(
			cacheKey,
			(async () => {
				const [categories, terms] = await Promise.all([
					fetchContainers(
						{ organization: normalizedScope, payloadType: [payloadTypes.enum.category] },
						'alpha'
					),
					fetchContainers(
						{ organization: normalizedScope, payloadType: [payloadTypes.enum.term] },
						'alpha'
					)
				]);

				const categoryList = categories.filter(isCategoryContainer);
				const termContainers = terms.filter(isTermContainer);
				const categoryLabels: Record<string, string> = {};

				const result: CategoryOptions = {};

				for (const category of categoryList) {
					const key = category.payload.key;
					if (!key) continue;
					categoryLabels[key] = category.payload.title ?? key;

					const options = findTermsForCategory(category, termContainers).map((term) => ({
						label: term.payload.filterLabel ?? term.payload.title ?? term.payload.value,
						value: term.payload.value,
						guid: term.guid
					}));

					const sorted = sortOptions(options);
					result[key] = sorted;
				}

				for (const key of normalizedCategories) {
					if (!result[key]) {
						result[key] = [];
					}
				}

				result['__categoryLabels__'] = categoryLabels;

				return result;
			})()
		);
	}

	return cache.get(cacheKey) as Promise<CategoryOptions>;
}
