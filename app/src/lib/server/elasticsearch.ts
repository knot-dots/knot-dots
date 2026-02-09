import { Client, type estypes } from '@elastic/elasticsearch';
import type { DatabaseConnection } from 'slonik';
import { env as privateEnv } from '$env/dynamic/private';
import type { Container, PayloadType } from '$lib/models';
import { sql, withUserAndRelation } from './db';

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

function buildElasticsearchSortClause(sort: string): estypes.Sort {
	if (sort === 'modified') {
		return [
			{ validFrom: { order: 'desc', missing: '_first', unmapped_type: 'date' } },
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

export function getManyContainersWithES(
	organizations: string[],
	filters: {
		assignees?: string[];
		audience?: string[];
		sdg?: string[];
		customCategories?: Record<string, string[]>;
		indicatorCategories?: string[];
		indicator?: string;
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
	limit?: number
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const must: estypes.QueryDslQueryContainer[] = [];
		const filter: estypes.QueryDslQueryContainer[] = [];

		if (filters.terms) {
			must.push({
				multi_match: { query: filters.terms, fields: ['title^2', 'text'], fuzziness: 'AUTO' }
			});
		}
		if (filters.type?.length) filter.push({ terms: { type: filters.type } });
		if (filters.sdg?.length) filter.push({ terms: { 'payload.category': filters.sdg } });
		if (filters.topics?.length) filter.push({ terms: { 'payload.topic': filters.topics } });
		if (filters.audience?.length) filter.push({ terms: { 'payload.audience': filters.audience } });
		if (filters.policyFieldsBNK?.length)
			filter.push({ terms: { 'payload.policyFieldBNK': filters.policyFieldsBNK } });
		if (filters.programTypes?.length)
			filter.push({ terms: { 'payload.programType': filters.programTypes } });
		if (filters.indicatorCategories?.length)
			filter.push({ terms: { 'payload.indicatorCategory': filters.indicatorCategories } });
		if (filters.indicatorTypes?.length)
			filter.push({ terms: { 'payload.indicatorType': filters.indicatorTypes } });
		if (filters.taskCategories?.length)
			filter.push({ terms: { 'payload.taskCategory': filters.taskCategories } });
		if (filters.resourceCategories?.length)
			filter.push({ terms: { 'payload.resourceCategory': filters.resourceCategories } });
		if (filters.customCategories) {
			for (const [key, values] of Object.entries(filters.customCategories)) {
				if (!values?.length) continue;
				filter.push({ terms: { [`payload.${key}`]: values } });
			}
		}
		if (filters.assignees?.length)
			filter.push({ terms: { 'payload.assignee': filters.assignees } });
		if (filters.organizationalUnits?.length)
			filter.push({ terms: { organizationalUnit: filters.organizationalUnits } });
		if (organizations.length) filter.push({ terms: { organization: organizations } });
		if (filters.template !== undefined) {
			filter.push({ term: { 'payload.template': filters.template } });
		} else {
			// Match SQL behavior: when template filter is not specified, exclude templates by default
			// SQL: (c.payload @> '{"template": false}' OR NOT payload ? 'template')
			filter.push({
				bool: {
					should: [
						{ term: { 'payload.template': false } },
						{ bool: { must_not: { exists: { field: 'payload.template' } } } }
					],
					minimum_should_match: 1
				}
			});
		}

		const query: estypes.QueryDslQueryContainer = { bool: { must, filter } };
		const esSortClauses = buildElasticsearchSortClause(sort);
		const sizeParam = limit && Number.isInteger(limit) && limit >= 0 ? limit : 10000;

		const searchParams: estypes.SearchRequest = {
			index: privateEnv.ELASTICSEARCH_INDEX_ALIAS ?? 'containers',
			query,
			sort: esSortClauses,
			size: sizeParam,
			_source: ['guid']
		};

		const { hits } = await es.search<{ guid: string }>(searchParams);

		const guids = hits.hits.flatMap((h) => (h._source?.guid ? [h._source.guid] : []));

		if (guids.length === 0) return [];

		const containerResult = await connection.any(sql.typeAlias('container')`
				SELECT c.*
				FROM container c
				WHERE c.guid IN (${sql.join(
					guids.map((g) => sql.fragment`${g}`),
					sql.fragment`, `
				)})
				AND deleted = false
				AND valid_currently
				ORDER BY array_position(${sql.array(guids, 'uuid')}, c.guid)
			`);

		return withUserAndRelation<Container>(connection, containerResult);
	};
}

export async function getFacetAggregationsForGuids(
	guids: string[],
	customCategoryKeys: string[] = []
) {
	if (guids.length === 0) {
		return {} as Record<string, Record<string, number>>;
	}
	const query = { terms: { guid: guids } } as const;
	const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
		audience: { terms: { field: 'payload.audience', size: 50 } },
		sdg: { terms: { field: 'payload.sdg', size: 100 } },
		topic: { terms: { field: 'payload.topic', size: 100 } },
		policyFieldBNK: { terms: { field: 'payload.policyFieldBNK', size: 100 } },
		programType: { terms: { field: 'payload.programType', size: 20 } },
		measureType: { terms: { field: 'payload.measureType', size: 20 } },
		indicatorCategory: { terms: { field: 'payload.indicatorCategory', size: 100 } },
		indicatorType: { terms: { field: 'payload.indicatorType', size: 20 } },
		taskCategory: { terms: { field: 'payload.taskCategory', size: 50 } },
		resourceCategory: { terms: { field: 'payload.resourceCategory', size: 20 } },
		resourceUnit: { terms: { field: 'payload.resourceUnit', size: 20 } }
	};

	const reserved = new Set(Object.keys(aggs));
	for (const key of customCategoryKeys) {
		if (!key || reserved.has(key)) continue;
		aggs[key] = { terms: { field: `payload.${key}`, size: 200 } };
	}

	const { aggregations } = await es.search<unknown, estypes.SearchRequest>({
		index: privateEnv.ELASTICSEARCH_INDEX_ALIAS ?? 'containers',
		size: 0,
		query,
		aggs
	});
	const facets: Record<string, Record<string, number>> = {};
	type TermsBucket = { key: string | number; key_as_string?: string; doc_count?: number };
	const toCounts = (agg?: estypes.AggregationsAggregate): Record<string, number> => {
		if (!agg || !('buckets' in agg)) return {};
		const buckets = (agg as estypes.AggregationsTermsAggregateBase<TermsBucket>).buckets;
		if (!Array.isArray(buckets)) return {};
		return Object.fromEntries(
			buckets.map((b) => [String(b.key_as_string ?? b.key), b.doc_count ?? 0])
		);
	};
	const aggMap = aggregations as Record<string, estypes.AggregationsAggregate> | undefined;
	if (aggMap) {
		facets.audience = toCounts(aggMap.audience);
		facets.sdg = toCounts(aggMap.sdg);
		facets.topic = toCounts(aggMap.topic);
		facets.policyFieldBNK = toCounts(aggMap.policyFieldBNK);
		facets.programType = toCounts(aggMap.programType);
		facets.measureType = toCounts(aggMap.measureType);
		facets.indicatorCategory = toCounts(aggMap.indicatorCategory);
		facets.indicatorType = toCounts(aggMap.indicatorType);
		facets.taskCategory = toCounts(aggMap.taskCategory);
		facets.resourceCategory = toCounts(aggMap.resourceCategory);
		facets.resourceUnit = toCounts(aggMap.resourceUnit);
		for (const key of customCategoryKeys) {
			facets[key] = toCounts(aggMap[key]);
		}
	}
	return facets;
}
