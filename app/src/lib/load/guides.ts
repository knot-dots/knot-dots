import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type Container, payloadTypes, predicates, type ProgramPayload } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/guides/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-superordinate-of']
];

export default (async function load({ depends, fetch, params, parent, url }) {
	depends('containers');

	const query = new URLSearchParams([
		...url.searchParams,
		['programType', 'program_type.guide'],
		['type', payloadTypes.enum.program]
	]);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
	}

	const [data, { categoryContext, currentOrganization }] = await Promise.all([
		fetchContainerPage<Container<ProgramPayload>>({
			contextGuid: params.guid,
			fetch,
			limit: DEFAULT_PAGE_SIZE,
			offset: 0,
			query
		}),
		parent()
	]);

	const filteredCategoryContext = filterCategoryContext(categoryContext, [
		payloadTypes.enum.program
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
} satisfies PageServerLoad);
