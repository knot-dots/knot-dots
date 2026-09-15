import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('$app/state', () => ({
	page: {
		data: {
			categoryContext: { keys: ['customCategory'] }
		}
	}
}));

import fetchContainers from '$lib/client/fetchContainers';
import { MAX_PAGE_SIZE } from '$lib/pagination';

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('fetches and unwraps a maximum-sized container v2 page', async () => {
	fetchMock.mockResolvedValueOnce(
		new Response(
			JSON.stringify({
				containers: [],
				facets: {},
				page: {
					hasMore: false,
					limit: MAX_PAGE_SIZE,
					nextOffset: null,
					offset: 0,
					total: 0
				}
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		)
	);

	const controller = new AbortController();
	const result = await fetchContainers(
		{
			availableIn: '00000000-0000-4000-8000-000000000001',
			customCategory: ['category'],
			payloadType: ['report'],
			template: 'true'
		},
		'alpha',
		{ signal: controller.signal }
	);

	expect(result).toEqual([]);
	expect(fetchMock).toHaveBeenCalledOnce();
	const [requestUrl, init] = fetchMock.mock.calls[0];
	const url = new URL(String(requestUrl), 'http://localhost');
	expect(url.pathname).toBe('/container/v2');
	expect(url.searchParams.get('availableIn')).toBe('00000000-0000-4000-8000-000000000001');
	expect(url.searchParams.getAll('customCategory')).toEqual(['category']);
	expect(url.searchParams.getAll('payloadType')).toEqual(['report']);
	expect(url.searchParams.get('template')).toBe('true');
	expect(url.searchParams.get('sort')).toBe('alpha');
	expect(url.searchParams.get('limit')).toBe(String(MAX_PAGE_SIZE));
	expect(init).toEqual({ signal: controller.signal });
});
