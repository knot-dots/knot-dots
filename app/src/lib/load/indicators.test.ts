import { expect } from 'vitest';
import { test } from '$lib/fixtures';
import { emptyGrantRecords, isIndicatorContainer, isBinaryIndicatorContainer } from '$lib/models';
import { getPool, sql } from '$lib/server/db';
import { getIndicatorsData } from '$lib/load/indicators';

// This test compares against Elasticsearch and relies on the sample data seeded by
// the import; skip it where only a migrated database is available (e.g. in CI).
test.skipIf(!process.env.ELASTICSEARCH_INDEX_ALIAS)(
	'indicator facet counts match the indicators shown',
	async ({ connection }) => {
		const org = await connection.one(sql.typeAlias('guid')`
		SELECT guid FROM container
		WHERE payload->>'name' = 'Musterhausen'
			AND payload->>'type' = 'organization'
			AND valid_currently
			AND NOT deleted
		LIMIT 1
	`);
		const pool = await getPool();

		const result = await getIndicatorsData({
			organizationGuid: org.guid,
			currentOrganizationalUnit: null,
			filters: {
				customCategories: {},
				indicatorCategories: [],
				indicatorTypes: [],
				included: [],
				terms: ''
			},
			user: {
				familyName: '',
				givenName: '',
				grants: emptyGrantRecords(),
				guid: '',
				isAuthenticated: false,
				roles: [],
				settings: {}
			},
			customCategoryKeys: ['sdg'],
			connect: pool.connect
		});

		const indicators = result.containers.filter(
			(c) => isIndicatorContainer(c) || isBinaryIndicatorContainer(c)
		);
		expect(indicators.length).toBeGreaterThan(0);

		const countBy = (key: 'indicatorType' | 'indicatorCategory' | 'sdg') => {
			const counts: Record<string, number> = {};
			for (const { payload } of indicators) {
				const values = key === 'sdg' ? payload.category?.sdg : payload[key];
				for (const value of values ?? []) {
					counts[value] = (counts[value] ?? 0) + 1;
				}
			}
			return counts;
		};

		expect(result.facetData?.indicatorType).toEqual(countBy('indicatorType'));
		expect(result.facetData?.indicatorCategory).toEqual(countBy('indicatorCategory'));
		expect(result.facetData?.sdg).toEqual(countBy('sdg'));
	}
);
