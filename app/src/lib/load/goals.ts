import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type GoalContainer, payloadTypes, predicates } from '$lib/models';
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
			fetchContainerPage<GoalContainer>({
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
						...[...data.facets]
							.filter(([key]) => key === 'status' || filteredCategoryContext.keys.includes(key))
							.map(([key, values]) =>
								key === 'status'
									? ([key, new Map([...values].filter(([k]) => k !== 'status.in_operation'))] as [
											string,
											Map<string, number>
										])
									: ([key, values] as [string, Map<string, number>])
							)
					])
		};
	}) satisfies PageServerLoad;

export default loadPage(DEFAULT_PAGE_SIZE);
