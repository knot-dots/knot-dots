import fetchContainerPage from '$lib/client/fetchContainerPage';
import { payloadTypes, type ReportContainer } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, fetch, params, url }) => {
	depends('containers');

	const query = new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.report]]);

	return await fetchContainerPage<ReportContainer>({
		contextGuid: params.guid,
		fetch,
		limit: DEFAULT_PAGE_SIZE,
		offset: 0,
		query
	});
}) satisfies PageServerLoad;
