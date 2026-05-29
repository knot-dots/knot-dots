import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type AnyContainer, payloadTypes, predicates } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/all/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['contributes-to'],
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export default (async function load({ depends, fetch, params, parent, url }) {
	depends('containers');

	const allTypeOptions = [
		payloadTypes.enum.goal,
		payloadTypes.enum.help,
		payloadTypes.enum.knowledge,
		payloadTypes.enum.measure,
		payloadTypes.enum.organizational_unit,
		payloadTypes.enum.page,
		payloadTypes.enum.program,
		payloadTypes.enum.report,
		payloadTypes.enum.rule,
		payloadTypes.enum.simple_measure,
		payloadTypes.enum.task
	] as string[];
	const typeFilterFromURL = url.searchParams.getAll('type');
	const typeFilter = allTypeOptions.filter(
		(type) => typeFilterFromURL.length === 0 || typeFilterFromURL.includes(type)
	);

	const query = new URLSearchParams(url.searchParams);
	query.delete('type');
	for (const t of typeFilter) query.append('type', t);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
	}

	const [data, { categoryContext, currentOrganization }] = await Promise.all([
		fetchContainerPage<AnyContainer>({
			contextGuid: params.guid,
			fetch,
			limit: DEFAULT_PAGE_SIZE,
			offset: 0,
			query
		}),
		parent()
	]);

	const filteredCategoryContext = filterCategoryContext(categoryContext, typeFilter, {
		matchAll: true
	});

	return {
		...data,
		facets: url.searchParams.has('related-to')
			? new Map([['relationType', new Map(DEFAULT_RELATION_TYPES.map((rt) => [rt, 0]))]])
			: new Map([
					...((!currentOrganization.payload.default
						? [['included', new Map<string, number>()]]
						: []) as Array<[string, Map<string, number>]>),
					['status', data.facets.get('status') ?? new Map()],
					...[...data.facets].filter(
						([key]) => filteredCategoryContext.keys.includes(key)
					),
					...((typeFilter.length == 1 && typeFilter[0] == 'program'
						? [['programType', data.facets.get('programType')!]]
						: []) as Array<[string, Map<string, number>]>),
					[
						'type',
						new Map(
							[...(data.facets.get('type') ?? [])].filter(([k]) => allTypeOptions.includes(k))
						)
					]
				])
	};
} satisfies PageServerLoad);
