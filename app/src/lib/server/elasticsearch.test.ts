import { beforeEach, expect, test, vi } from 'vitest';
import type { estypes } from '@elastic/elasticsearch';

const { search } = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock('$env/dynamic/private', () => ({
	env: { ELASTICSEARCH_URL: 'http://localhost:9200' }
}));

vi.mock('@elastic/elasticsearch', () => ({
	Client: class Client {
		search = search;
	}
}));

vi.mock('$lib/server/computeUserGrants', () => ({
	enrichContainers: vi.fn(async (_pool: unknown, containers: unknown[]) => containers)
}));

vi.mock('$lib/server/db', () => ({
	getPool: vi.fn()
}));

import { hiddenPayloadTypes, payloadTypes } from '$lib/models';
import { getManyContainersWithES } from '$lib/server/elasticsearch';

beforeEach(() => {
	search.mockReset().mockResolvedValue({ hits: { hits: [] } });
});

function sentQuery() {
	const { query } = search.mock.calls[0][0] as estypes.SearchRequest;
	return query as { bool: { filter: estypes.QueryDslQueryContainer[] } };
}

function excludedTypes(query: { bool: { filter: estypes.QueryDslQueryContainer[] } }) {
	for (const clause of query.bool.filter) {
		const mustNot = clause?.bool?.must_not as estypes.QueryDslQueryContainer | undefined;
		const types = (mustNot?.terms as Record<string, string[]> | undefined)?.type;
		if (types) return types;
	}
	return undefined;
}

test('searches leave hidden payload types out', async () => {
	await getManyContainersWithES([], {}, 'alpha');

	expect(excludedTypes(sentQuery())).toEqual(hiddenPayloadTypes);
});

test('searches for guids reach hidden payload types', async () => {
	await getManyContainersWithES([], { guid: ['6ba7b810-9dad-11d1-80b4-00c04fd430c8'] }, 'alpha');

	expect(excludedTypes(sentQuery())).toBeUndefined();
});

test('searches include the hidden payload types asked for by type', async () => {
	await getManyContainersWithES(
		[],
		{ type: [payloadTypes.enum.goal, payloadTypes.enum.text] },
		'alpha'
	);

	const excluded = excludedTypes(sentQuery());
	expect(excluded).not.toContain(payloadTypes.enum.text);
	expect(excluded).toContain(payloadTypes.enum.actual_data);
});
