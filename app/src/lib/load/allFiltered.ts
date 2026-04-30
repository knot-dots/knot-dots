import all from '$lib/load/all';

/**
 * Calls the shared `all` loader with the supplied type filter forced into
 * the URL search params, regardless of any incoming `type` query parameter.
 */
export function loadAllFilteredBy(
	event: { url: URL },
	types: readonly string[]
): ReturnType<typeof all> {
	const url = new URL(event.url);
	url.searchParams.delete('type');
	for (const t of types) url.searchParams.append('type', t);
	return all({ ...event, url } as Parameters<typeof all>[0]);
}
