import fetchContainers from '$lib/client/fetchContainers';
import {
	buildCategoryFacets,
	buildCategoryLabels,
	buildCategoryOptionsFromContainers,
	getCategoryKeys,
	type CategoryOption,
	type CategoryOptions
} from '$lib/categoryOptions';
import {
	isCategoryContainer,
	isTermContainer,
	payloadTypes,
	type CategoryContainer
} from '$lib/models';

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

function toCacheKey(categoryKeys: string[], organizationScope: string[], objectTypes: string[]) {
	const scopeKey = Array.from(new Set(organizationScope)).sort().join(',');
	const categoriesKey = Array.from(new Set(categoryKeys)).sort().join(',');
	const objectTypesKey = Array.from(new Set(objectTypes)).sort().join(',');
	return `${scopeKey}|${categoriesKey}|${objectTypesKey}`;
}

export function categoryMatchesObjectTypes(category: CategoryContainer, allowed: Iterable<string>) {
	const allowedSet = new Set(normalize(Array.from(allowed)));
	if (allowedSet.size === 0) return true;

	const configured = normalize((category.payload as Record<string, unknown>).objectTypes);
	if (configured.length === 0) return true;

	return configured.some((type) => allowedSet.has(type));
}

const cache = new Map<string, Promise<CategoryOptions>>();

export async function loadCategoryOptions(
	categoryKeys: unknown,
	organizationScope: unknown,
	objectTypes?: unknown
): Promise<CategoryOptions> {
	const normalizedCategories = normalize(categoryKeys);
	const normalizedScope = normalize(organizationScope);
	const normalizedObjectTypes = normalize(objectTypes);
	const cacheKey = toCacheKey(normalizedCategories, normalizedScope, normalizedObjectTypes);

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

				const allowedTypes = new Set(normalizedObjectTypes);
				const filteredCategories = categories
					.filter(isCategoryContainer)
					.filter((category) => categoryMatchesObjectTypes(category, allowedTypes));
				const categoryOptions = buildCategoryOptionsFromContainers(
					filteredCategories,
					terms.filter(isTermContainer)
				);

				if (allowedTypes.size === 0) {
					for (const key of normalizedCategories) {
						if (!categoryOptions[key]) {
							categoryOptions[key] = [];
						}
					}
				}

				return categoryOptions;
			})()
		);
	}

	return cache.get(cacheKey) as Promise<CategoryOptions>;
}
