import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type Container, payloadTypes, predicates, type RulePayload } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/rules/$types';

const DEFAULT_RELATION_TYPES = [predicates.enum['is-inconsistent-with']] as string[];

export const loadPage = (limit: number) =>
	(async ({ depends, fetch, params, parent, url }) => {
		depends('containers');

		const query = new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.rule]]);

		if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
			for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
		}

		const [data, { categoryContext, currentOrganization }] = await Promise.all([
			fetchContainerPage<Container<RulePayload>>({
				contextGuid: params.guid,
				fetch,
				limit,
				offset: 0,
				query
			}),
			parent()
		]);

		const filteredCategoryContext = filterCategoryContext(categoryContext, [
			payloadTypes.enum.rule
		]);

		return {
			...data,
			facets: url.searchParams.has('related-to')
				? new Map([['relationType', new Map(DEFAULT_RELATION_TYPES.map((rt) => [rt, 0]))]])
				: new Map([
						...((!currentOrganization.payload.default
							? [['included', new Map<string, number>()]]
							: []) as Array<[string, Map<string, number>]>),
						['status', data.facets.get('status') ?? new Map()],
						...[...data.facets].filter(([key]) => filteredCategoryContext.keys.includes(key))
					])
		};
	}) satisfies PageServerLoad;

export default loadPage(DEFAULT_PAGE_SIZE);
