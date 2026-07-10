import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type Container, type HelpPayload, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/help/$types';

export default (async function load({ depends, fetch, params, parent, url }) {
	depends('containers');

	const { currentOrganization } = await parent();

	if (!currentOrganization.payload.default) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const [data, { categoryContext }] = await Promise.all([
		fetchContainerPage<Container<HelpPayload>>({
			contextGuid: params.guid,
			fetch,
			limit: DEFAULT_PAGE_SIZE,
			offset: 0,
			query: new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.help]])
		}),
		parent()
	]);

	const filteredCategoryContext = filterCategoryContext(categoryContext, [payloadTypes.enum.help]);

	return {
		...data,
		facets: new Map([
			...((!currentOrganization.payload.default
				? [['included', new Map<string, number>()]]
				: []) as Array<[string, Map<string, number>]>),
			...[...data.facets].filter(([key]) => filteredCategoryContext.keys.includes(key))
		])
	};
} satisfies PageServerLoad);
