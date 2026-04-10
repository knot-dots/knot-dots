import { type CategoryContainer, predicates, type TermContainer } from '$lib/models';

export type CategoryOption = {
	label: string;
	value: string;
	guid: string;
	icon?: string;
	subOptions?: CategoryOption[];
};

export type CategoryOptions = Record<string, CategoryOption[]> & {
	__categoryLabels__?: Record<string, string>;
};

export type CategoryContext = {
	options: CategoryOptions;
	labels: Map<string, string>;
	keys: string[];
	objectTypesPerKey: Record<string, string[]>;
};

const LABELS_KEY = '__categoryLabels__';

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

function toOption(term: TermContainer): CategoryOption {
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
	categories: Array<CategoryContainer>,
	terms: Array<TermContainer>
): CategoryOptions {
	const categoryLabels: Record<string, string> = {};
	const result: CategoryOptions = {};
	const subtermsByParent = new Map<string, TermContainer[]>();

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
		categoryLabels[key] = category.payload.title ?? key;

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

	result[LABELS_KEY] = categoryLabels;
	return result;
}

export function getCategoryKeys(options: CategoryOptions): string[] {
	return Object.keys(options).filter((key) => key !== LABELS_KEY);
}

export function buildCategoryFacets(
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
		if (rawKey === LABELS_KEY) continue;
		if (!Array.isArray(list)) continue;
		const facetMap = new Map<string, number>();
		const countsForFacet = counts[rawKey] ?? {};

		list.forEach((option) => applyCounts(option, countsForFacet, facetMap));
		result.set(rawKey, facetMap);
	}

	return result;
}

export function buildCategoryFacetsWithCounts(
	options: CategoryOptions,
	counts: Record<string, Record<string, number>> = {}
) {
	return buildCategoryFacets(options, counts);
}

export function buildCategoryLabels(options: CategoryOptions) {
	const labels = new Map<string, string>();

	for (const [facetKey, label] of Object.entries(options[LABELS_KEY] ?? {})) {
		labels.set(facetKey, label);
	}

	for (const list of Object.values(options)) {
		if (!Array.isArray(list)) continue;
		const addOption = (option?: CategoryOption) => {
			if (!option) return;
			const resolved = option.label ?? option.value;
			labels.set(option.value, resolved);
			if (option.guid) labels.set(option.guid, resolved);
			option.subOptions?.forEach(addOption);
		};

		list.forEach(addOption);
	}

	return labels;
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
