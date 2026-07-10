import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import {
	type Container,
	type MeasurePayload,
	payloadTypes,
	predicates,
	type SimpleMeasurePayload
} from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/measures/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-prerequisite-for']
];

export const loadPage = (limit: number) =>
	(async ({ depends, fetch, params, parent, url }) => {
		depends('containers');

		const query = new URLSearchParams([
			...url.searchParams,
			['type', payloadTypes.enum.measure],
			['type', payloadTypes.enum.simple_measure]
		]);

		if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
			for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
		}

		const [data, { categoryContext, currentOrganization }] = await Promise.all([
			fetchContainerPage<Container<MeasurePayload | SimpleMeasurePayload>>({
				contextGuid: params.guid,
				fetch,
				limit,
				offset: 0,
				query
			}),
			parent()
		]);

		const filteredCategoryContext = filterCategoryContext(categoryContext, [
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure
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
