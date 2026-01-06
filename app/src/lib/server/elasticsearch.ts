import { Client } from '@elastic/elasticsearch';
import type { DatabaseConnection } from 'slonik';
import type { Container, PayloadType } from '$lib/models';
import { withUserAndRelation, sql } from './db';
import { env as privateEnv } from '$env/dynamic/private';

export function getManyContainersWithES(
	organizations: string[],
	filters: {
		assignees?: string[];
		audience?: string[];
		categories?: string[];
		indicatorCategories?: string[];
		measureTypes?: string[];
		indicator?: string;
		indicatorTypes?: string[];
		organizationalUnits?: string[];
		policyFieldsBNK?: string[];
		programTypes?: string[];
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
		const esUrl = privateEnv.ELASTICSEARCH_URL;
		const esIndex = privateEnv.ELASTICSEARCH_INDEX_ALIAS || 'containers';

		if (!esUrl) {
			console.warn('[getManyContainersWithES] No Elasticsearch URL configured');
			return [];
		}

		try {
			const es = new Client({ node: esUrl });
			const must: any[] = [];
			const filter: any[] = [];

			if (filters.terms) {
				must.push({
					multi_match: { query: filters.terms, fields: ['title^2', 'text'], fuzziness: 'AUTO' }
				});
			}
			if (filters.type?.length) filter.push({ terms: { type: filters.type } });
			if (filters.categories?.length)
				filter.push({ terms: { 'payload.category': filters.categories } });
			if (filters.topics?.length) filter.push({ terms: { 'payload.topic': filters.topics } });
			if (filters.audience?.length)
				filter.push({ terms: { 'payload.audience': filters.audience } });
			if (filters.policyFieldsBNK?.length)
				filter.push({ terms: { 'payload.policyFieldBNK': filters.policyFieldsBNK } });
			if (filters.programTypes?.length)
				filter.push({ terms: { 'payload.programType': filters.programTypes } });
			if (filters.measureTypes?.length)
				filter.push({ terms: { 'payload.measureType': filters.measureTypes } });
			if (filters.indicatorCategories?.length)
				filter.push({ terms: { 'payload.indicatorCategory': filters.indicatorCategories } });
			if (filters.indicatorTypes?.length)
				filter.push({ terms: { 'payload.indicatorType': filters.indicatorTypes } });
			if (filters.taskCategories?.length)
				filter.push({ terms: { 'payload.taskCategory': filters.taskCategories } });
			if (filters.assignees?.length)
				filter.push({ terms: { 'payload.assignee': filters.assignees } });
			if (filters.organizationalUnits?.length)
				filter.push({ terms: { organizationalUnit: filters.organizationalUnits } });
			if (organizations.length) filter.push({ terms: { organization: organizations } });
			if (filters.template !== undefined)
				filter.push({ term: { 'payload.template': filters.template } });

			const query = { bool: { must, filter } };
			const sortParam = sort === 'modified' ? [{ revision: 'desc' }] : [{ 'title.keyword': 'asc' }]; // Priority sorting handled in SQL
			const sizeParam = limit && Number.isInteger(limit) && limit >= 0 ? limit : 10000;

			const { hits } = await es.search({
				index: esIndex,
				query,
				sort: sortParam,
				size: sizeParam,
				_source: ['guid']
			});

			const guids = (hits.hits as any[]).map((h) => h._source.guid);
			console.log('[getManyContainersWithES] Elasticsearch returned', guids.length, 'results');

			if (guids.length === 0) return [];

			const containerResult = await connection.any(sql.typeAlias('container')`
				SELECT c.*
				FROM container c ${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON c.guid = task` : sql.fragment``}
				WHERE c.guid IN (${sql.join(
					guids.map((g) => sql.fragment`${g}`),
					sql.fragment`, `
				)})
				AND deleted = false
				AND valid_currently
				${sort == 'priority' ? sql.fragment`ORDER BY task_priority.priority ASC NULLS LAST, c.guid` : sql.fragment`ORDER BY array_position(${sql.array(guids, 'uuid')}, c.guid)`}
			`);

			console.log(
				'[getManyContainersWithES] SQL returned',
				containerResult.length,
				'results after ES filtering'
			);

			return withUserAndRelation<Container>(connection, containerResult);
		} catch (err) {
			console.error('[getManyContainersWithES] Elasticsearch error:', err);
			throw err;
		}
	};
}

export async function getFacetAggregationsForGuids(guids: string[]) {
	const esUrl = privateEnv.ELASTICSEARCH_URL;
	console.log('[getFacetAggregationsForGuids] Fetching facets for', guids.length, 'guids');
	const esIndex = privateEnv.ELASTICSEARCH_INDEX_CONTAINERS || 'containers';
	if (!esUrl || guids.length === 0) {
		return {} as Record<string, Record<string, number>>;
	}
	const es = new Client({ node: esUrl });
	const query = { terms: { guid: guids } } as const;
	const aggs: Record<string, any> = {
		audience: { terms: { field: 'payload.audience', size: 50 } },
		category: { terms: { field: 'payload.category', size: 100 } },
		topic: { terms: { field: 'payload.topic', size: 100 } },
		policyFieldBNK: { terms: { field: 'payload.policyFieldBNK', size: 100 } },
		programType: { terms: { field: 'payload.programType', size: 20 } },
		measureType: { terms: { field: 'payload.measureType', size: 20 } },
		indicatorCategory: { terms: { field: 'payload.indicatorCategory', size: 100 } },
		indicatorType: { terms: { field: 'payload.indicatorType', size: 20 } },
		taskCategory: { terms: { field: 'payload.taskCategory', size: 50 } }
	};

	const { aggregations } = await es.search({ index: esIndex, size: 0, query, aggs });
	const facets: Record<string, Record<string, number>> = {};
	const toCounts = (a: any) =>
		Object.fromEntries(
			(a?.buckets ?? []).map((b: any) => [String(b.key_as_string ?? b.key), b.doc_count])
		);
	if (aggregations) {
		facets.audience = toCounts((aggregations as any).audience);
		facets.category = toCounts((aggregations as any).category);
		facets.topic = toCounts((aggregations as any).topic);
		facets.policyFieldBNK = toCounts((aggregations as any).policyFieldBNK);
		facets.programType = toCounts((aggregations as any).programType);
		facets.measureType = toCounts((aggregations as any).measureType);
		facets.indicatorCategory = toCounts((aggregations as any).indicatorCategory);
		facets.indicatorType = toCounts((aggregations as any).indicatorType);
		facets.taskCategory = toCounts((aggregations as any).taskCategory);
	}
	return facets;
}
