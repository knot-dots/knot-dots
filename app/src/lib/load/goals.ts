import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type Container, type GoalPayload, payloadTypes, predicates } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/goals/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export const loadPage = (limit: number) =>
	(async ({ depends, fetch, params, parent, url }) => {
		depends('containers');

		const query = new URLSearchParams([
			...url.searchParams,
			['type', payloadTypes.enum.goal],
			['excludeRelation', predicates.enum['is-part-of-measure']]
		]);

		if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
			for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
		}

		const [data, { categoryContext, currentOrganization }] = await Promise.all([
			fetchContainerPage<Container<GoalPayload>>({
				contextGuid: params.guid,
				fetch,
				limit,
				offset: 0,
				query
			}),
			parent()
		]);

		const filteredCategoryContext = filterCategoryContext(categoryContext, [
			payloadTypes.enum.goal
		]);

		return {
			...data,
			facets: url.searchParams.has('related-to')
				? new Map([['relationType', new Map(DEFAULT_RELATION_TYPES.map((rt) => [rt, 0]))]])
				: new Map([
						...((!currentOrganization.payload.default
							? [['included', new Map<string, number>()]]
							: []) as Array<[string, Map<string, number>]>),
						[
							'status',
							new Map(
								[...(data.facets.get('status') ?? [])].filter(([k]) => k !== 'status.in_operation')
							)
						],
						...[...data.facets].filter(([key]) => filteredCategoryContext.keys.includes(key))
					])
		};
	}) satisfies PageServerLoad;

export default loadPage(DEFAULT_PAGE_SIZE);
