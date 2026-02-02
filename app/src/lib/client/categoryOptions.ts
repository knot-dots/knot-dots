import fetchContainers from '$lib/client/fetchContainers';
import {
	buildCategoryFacets,
	buildCategoryLabels,
	buildCategoryOptionsFromContainers,
	getCategoryKeys,
	type CategoryOption,
	type CategoryOptions
} from '$lib/categoryOptions';
import { isCategoryContainer, isTermContainer, payloadTypes } from '$lib/models';

export { buildCategoryFacets, buildCategoryLabels, getCategoryKeys };
export type { CategoryOption, CategoryOptions };

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
	const scopeKey = Array.from(new Set(normalize(organizationScope)))
		.sort()
		.join(',');
	const categoriesKey = Array.from(new Set(normalize(categoryKeys)))
		.sort()
		.join(',');
	return `${scopeKey}|${categoriesKey}`;
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

				const categoryOptions = buildCategoryOptionsFromContainers(
					categories.filter(isCategoryContainer),
					terms.filter(isTermContainer)
				);

				for (const key of getCategoryKeys({ ...categoryOptions, __categoryLabels__: {} })) {
					if (!categoryOptions[key]) {
						categoryOptions[key] = [];
					}
				}

				for (const key of normalizedCategories) {
					if (!categoryOptions[key]) {
						categoryOptions[key] = [];
					}
				}

				return categoryOptions;
			})()
		);
	}

	return cache.get(cacheKey) as Promise<CategoryOptions>;
}
