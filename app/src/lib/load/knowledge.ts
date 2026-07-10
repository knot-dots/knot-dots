import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type Container, type KnowledgePayload, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/knowledge/$types';

export default (async function load({ depends, fetch, params, parent, url }) {
	depends('containers');

	const [data, { categoryContext, currentOrganization }] = await Promise.all([
		fetchContainerPage<Container<KnowledgePayload>>({
			contextGuid: params.guid,
			fetch,
			limit: DEFAULT_PAGE_SIZE,
			offset: 0,
			query: new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.knowledge]])
		}),
		parent()
	]);

	const filteredCategoryContext = filterCategoryContext(categoryContext, [
		payloadTypes.enum.knowledge
	]);

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
