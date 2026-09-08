import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import fetchContainerCopyPreview from '$lib/client/fetchContainerCopyPreview';

const sourceGuid = '00000000-0000-4000-8000-000000000001';
const programGuid = '00000000-0000-4000-8000-000000000002';
const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(
		new Response(
			JSON.stringify({
				rows: [],
				rootGuid: sourceGuid
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		)
	);
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('loads and parses a global copy preview through the ordinary HTTP route', async () => {
	const controller = new AbortController();
	const preview = await fetchContainerCopyPreview(
		{ availableIn: null, sourceGuid },
		{ signal: controller.signal }
	);

	expect(preview.rootGuid).toBe(sourceGuid);
	const [requestUrl, init] = fetchMock.mock.calls[0];
	const url = new URL(String(requestUrl), 'http://localhost');
	expect(url.pathname).toBe('/container/copy');
	expect(url.searchParams.get('sourceGuid')).toBe(sourceGuid);
	expect(url.searchParams.has('availableIn')).toBe(false);
	expect(init).toEqual({ signal: controller.signal });
});

test('includes the program scope for a scoped template preview', async () => {
	await fetchContainerCopyPreview({ availableIn: programGuid, sourceGuid });

	const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost');
	expect(url.searchParams.get('availableIn')).toBe(programGuid);
});
