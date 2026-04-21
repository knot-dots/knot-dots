import { Client, estypes } from '@elastic/elasticsearch';
import { env as privateEnv } from '$env/dynamic/private';
import { anyContainer, type AnyContainer, type PayloadType } from '$lib/models';

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

type GetManyContainersWithESOptions = {
	customCategoryKeys?: string[];
	includeFacets?: boolean;
};

const defaultFacetKeys = [
	'audience',
	'sdg',
	'topic',
	'policyFieldBNK',
	'programType',
	'measureType',
	'indicatorCategory',
	'indicatorType',
	'taskCategory',
	'resourceCategory',
	'resourceUnit'
] as const;

const facetFieldMap: Record<string, string> = {
	audience: 'payload.audience',
	sdg: 'payload.sdg',
	topic: 'payload.topic',
	policyFieldBNK: 'payload.policyFieldBNK',
	programType: 'payload.programType',
	measureType: 'payload.measureType',
	indicatorCategory: 'payload.indicatorCategory',
	indicatorType: 'payload.indicatorType',
	taskCategory: 'payload.taskCategory',
	resourceCategory: 'payload.resourceCategory',
	resourceUnit: 'payload.resourceUnit'
};

const facetSizeMap: Record<string, number> = {
	audience: 50,
	sdg: 100,
	topic: 100,
	policyFieldBNK: 100,
	programType: 20,
	measureType: 20,
	indicatorCategory: 100,
	indicatorType: 20,
	taskCategory: 50,
	resourceCategory: 20,
	resourceUnit: 20
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

	for (const key of facetKeys) {
		const useCategoryField = customCategoryKeys.includes(key);
		const field = useCategoryField
			? `payload.category.${key}`
			: (facetFieldMap[key] ?? `payload.category.${key}`);
		const size = facetSizeMap[key] ?? 200;
		const filtersExceptKey: estypes.QueryDslQueryContainer[] = [];

		for (const [facetKey, clauses] of Object.entries(facetFilters)) {
			if (facetKey === key) continue;
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
	return [{ 'title.keyword': { order: 'asc', missing: '_last' } }, { guid: { order: 'asc' } }];
}

export async function getManyContainersWithES(
	organizations: string[],
	filters: {
		assignees?: string[];
		audience?: string[];
		sdg?: string[];
		customCategories?: Record<string, string[]>;
		indicatorCategories?: string[];
		indicators?: string[];
		indicatorTypes?: string[];
		organizationalUnits?: string[];
		policyFieldsBNK?: string[];
		programTypes?: string[];
		resourceCategories?: string[];
		taskCategories?: string[];
		template?: boolean;
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string,
	limit?: number,
	options?: GetManyContainersWithESOptions
): Promise<{ containers: AnyContainer[]; facets: FacetCounts }> {
	const must: estypes.QueryDslQueryContainer[] = [];
	const nonFacetFilters: estypes.QueryDslQueryContainer[] = [];
	const facetFilters: FacetFilterMap = {};

	if (filters.terms) {
		must.push({
			multi_match: { query: filters.terms, fields: ['title^2', 'text'], fuzziness: 'AUTO' }
		});
	}
	if (filters.type?.length) nonFacetFilters.push({ terms: { type: filters.type } });
	if (filters.sdg?.length)
		addFacetFilter(facetFilters, 'sdg', { terms: { 'payload.sdg': filters.sdg } });
	if (filters.topics?.length)
		addFacetFilter(facetFilters, 'topic', { terms: { 'payload.topic': filters.topics } });
	if (filters.audience?.length)
		addFacetFilter(facetFilters, 'audience', { terms: { 'payload.audience': filters.audience } });
	if (filters.policyFieldsBNK?.length)
		addFacetFilter(facetFilters, 'policyFieldBNK', {
			terms: { 'payload.policyFieldBNK': filters.policyFieldsBNK }
		});
	if (filters.programTypes?.length)
		addFacetFilter(facetFilters, 'programType', {
			terms: { 'payload.programType': filters.programTypes }
		});
	if (filters.indicatorCategories?.length)
		addFacetFilter(facetFilters, 'indicatorCategory', {
			terms: { 'payload.indicatorCategory': filters.indicatorCategories }
		});
	if (filters.indicatorTypes?.length)
		addFacetFilter(facetFilters, 'indicatorType', {
			terms: { 'payload.indicatorType': filters.indicatorTypes }
		});
	if (filters.taskCategories?.length)
		addFacetFilter(facetFilters, 'taskCategory', {
			terms: { 'payload.taskCategory': filters.taskCategories }
		});
	if (filters.resourceCategories?.length)
		addFacetFilter(facetFilters, 'resourceCategory', {
			terms: { 'payload.resourceCategory': filters.resourceCategories }
		});
	if (filters.customCategories) {
		for (const [key, values] of Object.entries(filters.customCategories)) {
			if (!values?.length) continue;
			addFacetFilter(facetFilters, key, { terms: { [`payload.category.${key}`]: values } });
		}
	}
	if (filters.assignees?.length)
		nonFacetFilters.push({ terms: { 'payload.assignee': filters.assignees } });
	if (filters.organizationalUnits?.length)
		nonFacetFilters.push({ terms: { organizational_unit: filters.organizationalUnits } });
	if (organizations.length) nonFacetFilters.push({ terms: { organization: organizations } });
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
	const sizeParam = limit && Number.isInteger(limit) && limit >= 0 ? limit : 10000;
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
		aggs
	};

	type ESDoc = {
		guid: string;
		revision: number;
		realm: string;
		organization: string;
		organizational_unit?: string | null;
		managed_by: string;
		valid_from?: string;
		relation?: { object: string; predicate: string; position: number; subject: string }[];
		user?: { predicate: string; subject: string }[];
		payload: Record<string, unknown>;
	};

	const { hits, aggregations } = await es.search<ESDoc>(searchParams);

	const containers: AnyContainer[] = hits.hits.flatMap((h) => {
		const doc = h._source;
		if (!doc) return [];
		return [
			anyContainer.parse({
				...doc,
				organizational_unit: doc.organizational_unit ?? null,
				valid_currently: true,
				relation: doc.relation ?? [],
				user: doc.user ?? []
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

	return { containers, facets };
}
