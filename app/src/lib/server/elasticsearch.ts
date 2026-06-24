import { Client, estypes } from '@elastic/elasticsearch';
import { env as privateEnv } from '$env/dynamic/private';
import { anyContainer, type AnyContainer, type PayloadType } from '$lib/models';
import type { ContainerQueryOptions } from '$lib/server/db';

const es = new Client({
	auth:
		privateEnv.ELASTICSEARCH_USERNAME && privateEnv.ELASTICSEARCH_PASSWORD
			? {
					username: privateEnv.ELASTICSEARCH_USERNAME,
					password: privateEnv.ELASTICSEARCH_PASSWORD
				}
			: undefined,
	node: privateEnv.ELASTICSEARCH_URL
});

type FacetCounts = Record<string, Record<string, number>>;

type ContainerElasticsearchOptions = ContainerQueryOptions & {
	customCategoryKeys?: string[];
	includeFacets?: boolean;
};

const defaultFacetKeys = [
	'administrativeType',
	'assignee',
	'federalState',
	'organization',
	'organizationalUnit',
	'programType',
	'indicatorCategory',
	'indicatorType',
	'status',
	'taskCategory',
	'resourceCategory',
	'resourceUnit',
	'type'
] as const;

const facetFieldMap: Record<string, string> = {
	administrativeType: 'payload.administrativeType',
	assignee: 'payload.assignee',
	federalState: 'payload.federalState',
	organization: 'organization',
	organizationalUnit: 'organizational_unit',
	programType: 'payload.programType',
	indicatorCategory: 'payload.indicatorCategory',
	indicatorType: 'payload.indicatorType',
	status: 'payload.status',
	taskCategory: 'payload.taskCategory',
	resourceCategory: 'payload.resourceCategory',
	resourceUnit: 'payload.resourceUnit',
	type: 'type'
};

const facetSizeMap: Record<string, number> = {
	administrativeType: 20,
	assignee: 200,
	federalState: 20,
	organization: 100,
	organizationalUnit: 500,
	programType: 20,
	indicatorCategory: 100,
	indicatorType: 20,
	status: 10,
	taskCategory: 50,
	resourceCategory: 20,
	resourceUnit: 20,
	type: 50
};

type FacetFilterMap = Record<string, estypes.QueryDslQueryContainer[]>;

function addFacetFilter(map: FacetFilterMap, key: string, clause: estypes.QueryDslQueryContainer) {
	if (!map[key]) map[key] = [];
	map[key].push(clause);
}

function buildFacetAggregations(params: {
	facetFilters: FacetFilterMap;
	customCategoryKeys: string[];
}) {
	const { facetFilters, customCategoryKeys } = params;
	const facetKeys = new Set<string>([...defaultFacetKeys, ...customCategoryKeys]);

	for (const key of Object.keys(facetFilters)) {
		facetKeys.add(key);
	}

	const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};

	// Coupled facets: selecting one should not affect the other's counts
	const coupledFacets: Record<string, string[]> = {
		organization: ['organizationalUnit'],
		organizationalUnit: ['organization']
	};

	for (const key of facetKeys) {
		const useCategoryField = customCategoryKeys.includes(key);
		const field = useCategoryField
			? `payload.category.${key}`
			: (facetFieldMap[key] ?? `payload.category.${key}`);
		const size = facetSizeMap[key] ?? 200;
		const excludeKeys = new Set([key, ...(coupledFacets[key] ?? [])]);
		const filtersExceptKey: estypes.QueryDslQueryContainer[] = [];

		for (const [facetKey, clauses] of Object.entries(facetFilters)) {
			if (excludeKeys.has(facetKey)) continue;
			filtersExceptKey.push(...clauses);
		}

		aggs[key] = {
			filter: { bool: { filter: filtersExceptKey } },
			aggs: { values: { terms: { field, size } } }
		};
	}

	return aggs;
}

function buildElasticsearchSortClause(sort: string): estypes.Sort {
	if (sort === 'modified') {
		return [
			{ valid_from: { order: 'desc', missing: '_first', unmapped_type: 'date' } },
			{ guid: { order: 'asc' } }
		];
	}
	if (sort === 'priority') {
		return [
			{ priority: { order: 'asc', missing: '_last', unmapped_type: 'integer' } },
			{ guid: { order: 'asc' } }
		];
	}
	if (sort === 'relevance') {
		return [{ _score: { order: 'desc' } }, { guid: { order: 'asc' } }];
	}
	return [
		{ 'title.icu_collation_keyword': { order: 'asc', missing: '_last' } },
		{ guid: { order: 'asc' } }
	];
}

export async function getManyContainersWithES(
	organizations: string[],
	filters: {
		administrativeTypes?: string[];
		assignees?: string[];
		customCategories?: Record<string, string[]>;
		federalStates?: string[];
		guid?: string[];
		hierarchyLevels?: number[];
		indicatorCategories?: string[];
		indicators?: string[];
		indicatorTypes?: string[];
		levels?: string[];
		organizationalUnits?: string[] | null;
		programTypes?: string[];
		resourceCategories?: string[];
		statuses?: string[];
		taskCategories?: string[];
		template?: boolean;
		terms?: string;
		type?: PayloadType[];
	},
	sort: string,
	options?: ContainerElasticsearchOptions
): Promise<{ containers: AnyContainer[]; facets: FacetCounts; total: number }> {
	const must: estypes.QueryDslQueryContainer[] = [];
	const nonFacetFilters: estypes.QueryDslQueryContainer[] = [];
	const facetFilters: FacetFilterMap = {};

	if (filters.terms) {
		must.push({
			multi_match: { query: filters.terms, fields: ['title^2', 'text'], fuzziness: 'AUTO' }
		});
	}
	if (filters.type?.length) {
		addFacetFilter(facetFilters, 'type', { terms: { type: filters.type } });
	}
	if (filters.administrativeTypes?.length) {
		addFacetFilter(facetFilters, 'administrativeType', {
			terms: { 'payload.administrativeType': filters.administrativeTypes }
		});
	}
	if (filters.federalStates?.length) {
		addFacetFilter(facetFilters, 'federalState', {
			terms: { 'payload.federalState': filters.federalStates }
		});
	}
	if (filters.statuses?.length) {
		addFacetFilter(facetFilters, 'status', {
			terms: { 'payload.status': filters.statuses }
		});
	}
	if (filters.guid?.length) {
		nonFacetFilters.push({ terms: { guid: filters.guid } });
	}
	if (filters.hierarchyLevels?.length) {
		nonFacetFilters.push({
			bool: {
				should: [
					{ terms: { 'payload.hierarchyLevel': filters.hierarchyLevels } },
					...(filters.hierarchyLevels.includes(1)
						? [{ bool: { must_not: { exists: { field: 'payload.hierarchyLevel' } } } }]
						: [])
				],
				minimum_should_match: 1
			}
		});
	}
	if (filters.levels?.length) {
		nonFacetFilters.push({ terms: { 'payload.level': filters.levels } });
	}
	if (filters.programTypes?.length) {
		addFacetFilter(facetFilters, 'programType', {
			terms: { 'payload.programType': filters.programTypes }
		});
	}
	if (filters.indicatorCategories?.length) {
		addFacetFilter(facetFilters, 'indicatorCategory', {
			terms: { 'payload.indicatorCategory': filters.indicatorCategories }
		});
	}
	if (filters.indicatorTypes?.length) {
		addFacetFilter(facetFilters, 'indicatorType', {
			terms: { 'payload.indicatorType': filters.indicatorTypes }
		});
	}
	if (filters.taskCategories?.length) {
		addFacetFilter(facetFilters, 'taskCategory', {
			terms: { 'payload.taskCategory': filters.taskCategories }
		});
	}
	if (filters.resourceCategories?.length) {
		addFacetFilter(facetFilters, 'resourceCategory', {
			terms: { 'payload.resourceCategory': filters.resourceCategories }
		});
	}
	if (filters.statuses?.length) {
		addFacetFilter(facetFilters, 'status', {
			terms: { 'payload.status': filters.statuses }
		});
	}
	if (filters.customCategories) {
		for (const [key, values] of Object.entries(filters.customCategories)) {
			if (!values?.length) continue;
			addFacetFilter(facetFilters, key, { terms: { [`payload.category.${key}`]: values } });
		}
	}
	if (filters.assignees?.length) {
		addFacetFilter(facetFilters, 'assignee', {
			terms: { 'payload.assignee': filters.assignees }
		});
	}
	if (filters.organizationalUnits === null) {
		nonFacetFilters.push({ bool: { must_not: { exists: { field: 'organizational_unit' } } } });
	} else if (filters.organizationalUnits?.length) {
		addFacetFilter(facetFilters, 'organizationalUnit', {
			terms: { organizational_unit: filters.organizationalUnits }
		});
	}
	if (organizations.length) {
		addFacetFilter(facetFilters, 'organization', { terms: { organization: organizations } });
	}
	if (filters.template !== undefined) {
		nonFacetFilters.push({ term: { 'payload.template': filters.template } });
	} else {
		// Match SQL behavior: when template filter is not specified, exclude templates by default
		// SQL: (c.payload @> '{"template": false}' OR NOT payload ? 'template')
		nonFacetFilters.push({
			bool: {
				should: [
					{ term: { 'payload.template': false } },
					{ bool: { must_not: { exists: { field: 'payload.template' } } } }
				],
				minimum_should_match: 1
			}
		});
	}

	const allFacetFilters = Object.values(facetFilters).flat();
	const query: estypes.QueryDslQueryContainer = {
		bool: { must, filter: [...nonFacetFilters] }
	};
	const postFilter: estypes.QueryDslQueryContainer | undefined =
		allFacetFilters.length > 0 ? { bool: { filter: allFacetFilters } } : undefined;
	const esSortClauses = buildElasticsearchSortClause(sort);
	const sizeParam =
		options?.limit && Number.isInteger(options.limit) && options.limit >= 0 ? options.limit : 10000;
	const aggs = options?.includeFacets
		? buildFacetAggregations({
				facetFilters,
				customCategoryKeys: options?.customCategoryKeys ?? []
			})
		: undefined;

	const searchParams: estypes.SearchRequest = {
		index: privateEnv.ELASTICSEARCH_INDEX_ALIAS ?? 'containers',
		query,
		post_filter: postFilter,
		sort: esSortClauses,
		size: sizeParam,
		from: options?.offset,
		aggs
	};

	const { hits, aggregations } = await es.search(searchParams);

	const containers: AnyContainer[] = hits.hits.flatMap((h) => {
		const doc = h._source;
		if (!doc) return [];
		return [
			anyContainer.parse({
				...doc,
				organizational_unit: (doc as Record<string, unknown>).organizational_unit ?? null,
				valid_currently: true,
				relation: (doc as Record<string, unknown>).relation ?? [],
				user: (doc as Record<string, unknown>).user ?? []
			})
		];
	});
	const facets: FacetCounts = {};
	if (options?.includeFacets !== false && aggregations) {
		type TermsBucket = { key: string | number; key_as_string?: string; doc_count?: number };
		const toCounts = (agg?: estypes.AggregationsAggregate): Record<string, number> => {
			if (!agg || !('buckets' in agg)) return {};
			const buckets = (agg as estypes.AggregationsTermsAggregateBase<TermsBucket>).buckets;
			if (!Array.isArray(buckets)) return {};
			return Object.fromEntries(
				buckets.map((b) => [String(b.key_as_string ?? b.key), b.doc_count ?? 0])
			);
		};

		for (const [key, agg] of Object.entries(aggregations)) {
			const filterAgg = agg as estypes.AggregationsFilterAggregate & {
				values?: estypes.AggregationsAggregate;
			};
			const valuesAgg = filterAgg.values;
			facets[key] = toCounts(valuesAgg);
		}
	}

	const total =
		typeof hits.total === 'number' ? hits.total : (hits.total?.value ?? containers.length);

	return { containers, facets, total };
}
