import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type HelpContainer, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/help/$types';

export default (async function load({ depends, fetch, params, parent, url }) {
	depends('containers');

	const { currentOrganization } = await parent();

	if (!currentOrganization.payload.default) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	return await fetchContainerPage<HelpContainer>({
		contextGuid: params.guid,
		fetch,
		limit: DEFAULT_PAGE_SIZE,
		offset: 0,
		query: new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.help]])
	});
} satisfies PageServerLoad);
