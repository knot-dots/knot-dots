import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers
} from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import {
	type AnyContainer,
	filterMembers,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	predicates,
	programTypes
} from '$lib/models';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from '../../routes/[guid=uuid]/measures/$types';

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	let containers: AnyContainer[];
	let data: Record<string, Record<string, number>> | undefined;
	let subordinateOrganizationalUnits: string[] = [];
	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();
	const categoryContext = filterCategoryContext(rawCategoryContext, [
		payloadTypes.enum.measure,
		payloadTypes.enum.simple_measure
	]);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relationType').length == 0
					? [
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-prerequisite-for']
						]
					: url.searchParams.getAll('relationType'),
				{ customCategories },
				url.searchParams.get('sort') ?? ''
			)
		);
	} else if (url.searchParams.has('programType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByProgramType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('programType'),
				{
					customCategories,
					terms: url.searchParams.get('terms') ?? ''
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		const esResult = await getManyContainersWithES(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{
				customCategories,
				programTypes: url.searchParams.getAll('programType'),
				terms: url.searchParams.get('terms') ?? '',
				type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
			},
			url.searchParams.get('sort') ?? '',
			{ customCategoryKeys: categoryContext.keys, includeFacets: true }
		);
		containers = esResult.containers;
		data = esResult.facets;
	}

	const filtered = filterMembers(
		filterOrganizationalUnits(
			filterVisible(containers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit ?? undefined
		),
		url.searchParams.getAll('member')
	);

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [
					[
						'relationType',
						new Map([
							[predicates.enum['is-consistent-with'], 0],
							[predicates.enum['is-equivalent-to'], 0],
							[predicates.enum['is-inconsistent-with'], 0],
							[predicates.enum['is-prerequisite-for'], 0]
						])
					]
				]
			: []) as Array<[string, Map<string, number>]>),
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>)
	]);

	if (categoryContext) {
		const customFacets = buildCategoryFacetsWithCounts(
			categoryContext.options,
			data ? Object.fromEntries(Object.entries(data)) : {}
		);
		for (const [key, values] of customFacets.entries()) {
			_facets.set(key, values);
		}
	}

	_facets.set('programType', fromCounts(programTypes.options as string[], data?.programType));
	_facets.set('member', new Map());

	const facets = _facets;

	return {
		containers: filtered,
		facets
	};
} satisfies PageServerLoad);
