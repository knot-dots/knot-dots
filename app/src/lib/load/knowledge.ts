import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type KnowledgeContainer, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/knowledge/$types';

export default (async function load({ depends, fetch, params, url }) {
	depends('containers');

	return await fetchContainerPage<KnowledgeContainer>({
		contextGuid: params.guid,
		fetch,
		limit: DEFAULT_PAGE_SIZE,
		offset: 0,
		query: new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.knowledge]])
	});
} satisfies PageServerLoad);
