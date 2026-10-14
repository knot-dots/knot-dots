import de from '$lib/locales/de.json';
import {
	type CategoryPayload,
	type Container,
	deduplicate,
	predicates,
	type TermPayload
} from '$lib/models';

export type CategoryOption = {
	label: string;
	value: string;
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

export function findTermLabel(options: CategoryOption[], termGuid: string): string | undefined {
	for (const opt of options) {
		if (opt.value === termGuid) {
			return opt.label;
		}
		if (opt.subOptions) {
			const found = findTermLabel(opt.subOptions, termGuid);
			if (found) {
				return found;
			}
		}
	}
	return undefined;
}

export function findCategoryGuid(
	nameOrAlias: string,
	categoryContext: CategoryContext
): string | undefined {
	const trimmed = nameOrAlias.trim();
	if (!trimmed) return undefined;
	const lower = trimmed.toLowerCase();

	if (categoryContext.keys.includes(trimmed)) {
		return trimmed;
	}

	for (const key of categoryContext.keys) {
		const label = categoryContext.labels.get(key);
		if (label && label.trim().toLowerCase() === lower) {
			return key;
		}
	}

	const aliasMap: Record<string, string[]> = {
		sdg: ['sdg', 'category', 'nr. des sdgs', 'sdgs', 'sustainable development goals'],
		topic: ['topic', 'topicarea', 'themenfeld', 'themenfelder', 'topics'],
		policyFieldBNK: [
			'policyfieldbnk',
			'handlungsfeld bnk',
			'handlungsfeld (bnk 2.0)',
			'handlungsfeld',
			'policy field bnk'
		],
		audience: ['audience', 'wirkungsbereich', 'zielgruppe', 'audiences']
	};

	let targetDefaultKey: string | undefined;
	for (const [defKey, aliases] of Object.entries(aliasMap)) {
		if (aliases.includes(lower)) {
			targetDefaultKey = defKey;
			break;
		}
	}

	if (targetDefaultKey) {
		const defaultTitles: Record<string, string[]> = {
			sdg: [de.category, 'SDG', 'sdg'].map((s) => s.toLowerCase()),
			topic: [de.topic, 'Themenfeld', 'Topic Area', 'Topic'].map((s) => s.toLowerCase()),
			policyFieldBNK: [
				de.policy_field_bnk,
				'Handlungsfeld (BNK 2.0)',
				'Handlungsfeld BNK',
				'Policy Field BNK'
			].map((s) => s.toLowerCase()),
			audience: [de.audience, 'Wirkungsbereich', 'Audience', 'Zielgruppe'].map((s) =>
				s.toLowerCase()
			)
		};

		const candidateTitles = defaultTitles[targetDefaultKey] ?? [];
		for (const key of categoryContext.keys) {
			const label = categoryContext.labels.get(key)?.trim().toLowerCase();
			if (label && candidateTitles.includes(label)) {
				return key;
			}
		}
	}

	return;
}

export function resolveCategoryTerms(
	value: string | string[],
	categoryGuid: string,
	categoryContext: CategoryContext
): string[] {
	if (!value) {
		return [];
	}

	const options = categoryContext.options[categoryGuid] ?? [];
	const flatOptions: CategoryOption[] = [];
	const collect = (opts: CategoryOption[]) => {
		for (const opt of opts) {
			flatOptions.push(opt);
			if (opt.subOptions) {
				collect(opt.subOptions);
			}
		}
	};
	collect(options);

	if (flatOptions.length === 0) {
		return [];
	}

	const translations = de as Record<string, unknown>;

	const resolveSingle = (item: string): string | undefined => {
		const trimmed = item.trim();
		if (!trimmed) {
			return;
		}
		const lower = trimmed.toLowerCase();

		const exactValueMatch = flatOptions.find((opt) => opt.value === trimmed);
		if (exactValueMatch) {
			return exactValueMatch.value;
		}

		const exactLabelMatch = flatOptions.find((opt) => opt.label.trim().toLowerCase() === lower);
		if (exactLabelMatch) {
			return exactLabelMatch.value;
		}

		const sdgMatch = trimmed.match(/^(?:sdg\.?|sdg\s+)?0*([1-9]|1[0-7])$/i);
		if (sdgMatch) {
			const num = parseInt(sdgMatch[1], 10);
			const numPrefixPattern = new RegExp(`^0*${num}\\s*[-.]`);
			const numMatch = flatOptions.find((opt) => numPrefixPattern.test(opt.label.trim()));
			if (numMatch) {
				return numMatch.value;
			}
		}

		const translated = translations[trimmed];
		if (typeof translated === 'string') {
			const transMatch = flatOptions.find(
				(opt) => opt.label.trim().toLowerCase() === translated.trim().toLowerCase()
			);
			if (transMatch) {
				return transMatch.value;
			}
		}

		return;
	};

	const rawItems = Array.isArray(value) ? value : [value];
	const resultGuids: string[] = [];

	for (const raw of rawItems) {
		if (typeof raw !== 'string') {
			continue;
		}

		const trimmed = raw.trim();
		if (!trimmed) {
			continue;
		}

		const directMatch = resolveSingle(trimmed);
		if (directMatch) {
			resultGuids.push(directMatch);
			continue;
		}

		const splitParts = trimmed
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean);

		for (const part of splitParts) {
			const partMatch = resolveSingle(part);
			if (partMatch) {
				resultGuids.push(partMatch);
			}
		}
	}

	return deduplicate(resultGuids);
}

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
	const value = term.guid;
	const filterLabel = term.payload.filterLabel?.trim();
	const label = filterLabel ? filterLabel : (term.payload.title ?? value);
	return {
		label,
		value,
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

		result[category.guid] = sortOptions(options);
	}

	return result;
}

export function getCategoryKeys(categories: Container<CategoryPayload>[]): string[] {
	return deduplicate(categories.map((category) => category.guid));
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
		const resolvedCount = countsForFacet[option.value] ?? countsForFacet[option.value];
		const count = resolvedCount ?? fallbackCount;

		facetMap.set(option.value, count);
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
		categories.map((category): [string, string] => [category.guid, category.payload.title])
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
