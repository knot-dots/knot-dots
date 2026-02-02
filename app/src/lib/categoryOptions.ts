import {
	isCategoryContainer,
	isTermContainer,
	predicates,
	type CategoryContainer,
	type TermContainer
} from '$lib/models';

export type CategoryOption = {
	label: string;
	value: string;
	guid: string;
	icon?: string;
	subterms?: CategoryOption[];
};

export type CategoryOptions = Record<string, CategoryOption[]> & {
	__categoryLabels__?: Record<string, string>;
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
	return {
		label: term.payload.filterLabel ?? term.payload.title ?? term.payload.value,
		value: term.payload.value,
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
				option.subterms = sortOptions(subterms.map(toOption));
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
		option.subterms?.forEach((sub) => applyCounts(sub, countsForFacet, facetMap));
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
			option.subterms?.forEach(addOption);
		};

		list.forEach(addOption);
	}

	return labels;
}
