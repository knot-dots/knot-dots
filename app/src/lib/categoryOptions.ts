import { type CategoryPayload, type Container, predicates, type TermPayload } from '$lib/models';

export type CategoryOption = {
	label: string;
	value: string;
	guid: string;
	icon?: string;
	subOptions?: CategoryOption[];
};

export type CategoryOptions = Record<string, CategoryOption[]>;

export type CategoryContext = {
	options: CategoryOptions;
	labels: Map<string, string>;
	keys: string[];
	objectTypesPerKey: Record<string, string[]>;
};

function sortOptions(options: CategoryOption[]) {
	return options.toSorted((a, b) =>
		a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
	);
}

function findTermsForCategory(
	category: Container<CategoryPayload>,
	terms: Container<TermPayload>[]
) {
	return terms.filter(({ relation }) =>
		relation?.some(
			({ object, predicate }) =>
				object === category.guid && predicate === predicates.enum['is-part-of-category']
		)
	);
}

function toOption(term: Container<TermPayload>): CategoryOption {
	const value = term.payload.value ?? term.payload.title ?? term.guid;
	const filterLabel = term.payload.filterLabel?.trim();
	const label = filterLabel ? filterLabel : (term.payload.title ?? value);
	return {
		label,
		value,
		guid: term.guid,
		icon: term.payload.icon
	};
}

export function buildCategoryOptionsFromContainers(
	categories: Array<Container<CategoryPayload>>,
	terms: Array<Container<TermPayload>>
): CategoryOptions {
	const result: CategoryOptions = {};
	const subtermsByParent = new Map<string, Container<TermPayload>[]>();

	for (const term of terms) {
		(term.relation ?? [])
			.filter(({ predicate }) => predicate === predicates.enum['is-part-of'])
			.forEach(({ object }) => {
				if (!object) return;
				const existing = subtermsByParent.get(object) ?? [];
				subtermsByParent.set(object, [...existing, term]);
			});
	}

	for (const category of categories) {
		const key = category.payload.key;
		if (!key) continue;

		const options = findTermsForCategory(category, terms).map((term) => {
			const option = toOption(term);
			const subterms = (subtermsByParent.get(term.guid) ?? []).filter(
				({ guid }) => guid !== term.guid
			);
			if (subterms.length) {
				option.subOptions = sortOptions(subterms.map(toOption));
			}
			return option;
		});

		result[key] = sortOptions(options);
	}

	for (const key of Object.keys(result)) {
		if (!result[key]) {
			result[key] = [];
		}
	}

	return result;
}

export function getCategoryKeys(categories: Container<CategoryPayload>[]): string[] {
	return categories.map((category) => category.payload.key).filter((key) => key !== undefined);
}

export function buildCategoryFacetsWithCounts(
	options: CategoryOptions,
	counts: Record<string, Record<string, number>> = {}
): Map<string, Map<string, number>> {
	const result = new Map<string, Map<string, number>>();

	const applyCounts = (
		option: CategoryOption | undefined,
		countsForFacet: Record<string, number>,
		facetMap: Map<string, number>
	) => {
		if (!option) return;
		const fallbackCount = facetMap.get(option.value) ?? 0;
		const resolvedCount =
			countsForFacet[option.value] ?? (option.guid ? countsForFacet[option.guid] : undefined);
		const count = resolvedCount ?? fallbackCount;

		facetMap.set(option.value, count);
		if (option.guid) facetMap.set(option.guid, count);
		option.subOptions?.forEach((sub) => applyCounts(sub, countsForFacet, facetMap));
	};

	for (const [rawKey, list] of Object.entries(options)) {
		if (!Array.isArray(list)) continue;
		const facetMap = new Map<string, number>();
		const countsForFacet = counts[rawKey] ?? {};

		list.forEach((option) => applyCounts(option, countsForFacet, facetMap));
		result.set(rawKey, facetMap);
	}

	return result;
}

export function buildCategoryLabels(categories: Container<CategoryPayload>[]) {
	return new Map(
		categories
			.filter(
				(category): category is Container<CategoryPayload & { key: string }> =>
					category.payload.key !== undefined
			)
			.map((category): [string, string] => [category.payload.key, category.payload.title])
	);
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

	return {
		options: filteredOptions,
		labels: new Map(context.labels.entries().filter(([key]) => filteredKeys.includes(key))),
		keys: filteredKeys,
		objectTypesPerKey: context.objectTypesPerKey
	};
}
