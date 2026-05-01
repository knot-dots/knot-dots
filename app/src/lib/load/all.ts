import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	predicates,
	programTypes,
	type OrganizationalUnitContainer
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from '../../routes/[guid=uuid]/all/$types';

export default (async function load({ depends, locals, url, parent }) {
	depends('containers');

	let containers;
	let data: Record<string, Record<string, number>> | undefined;
	let subordinateOrganizationalUnits: string[] = [];
	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();
	const features = createFeatureDecisions(locals.features);
	const typeFilterFromURL = url.searchParams.getAll('type');
	const allTypeOptions = [
		payloadTypes.enum.goal,
		payloadTypes.enum.help,
		payloadTypes.enum.knowledge,
		payloadTypes.enum.measure,
		payloadTypes.enum.organizational_unit,
		...(features.usePage() ? [payloadTypes.enum.page] : []),
		payloadTypes.enum.program,
		...(features.useReport() ? [payloadTypes.enum.report] : []),
		payloadTypes.enum.rule,
		payloadTypes.enum.simple_measure,
		payloadTypes.enum.task
	];
	const typeFilter = allTypeOptions.filter(
		(type) => typeFilterFromURL.length == 0 || typeFilterFromURL.includes(type)
	);
	const categoryContext = filterCategoryContext(rawCategoryContext, typeFilter, { matchAll: true });

	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = (await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		)) as OrganizationalUnitContainer[];
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter((unit) => unit.payload.level > currentOrganizationalUnit.payload.level)
			.map((unit) => unit.guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relationType').length === 0
					? [
							predicates.enum['contributes-to'],
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-part-of']
						]
					: url.searchParams.getAll('relationType'),
				{
					customCategories,
					type: typeFilter
				},
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
					terms: url.searchParams.get('terms') ?? '',
					type: typeFilter
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		if (features.useElasticsearch()) {
			const esResult = await getManyContainersWithES(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					customCategories,
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: typeFilter
				},
				url.searchParams.get('sort') ?? '',
				{ customCategoryKeys: categoryContext.keys, includeFacets: true }
			);
			containers = esResult.containers;
			data = esResult.facets;
		} else {
			containers = await locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						customCategories,
						programTypes: url.searchParams.getAll('programType'),
						terms: url.searchParams.get('terms') ?? '',
						type: typeFilter
					},
					url.searchParams.get('sort') ?? ''
				)
			);
		}
	}

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit ?? undefined
	);

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [
					[
						'relationType',
						new Map([
							[predicates.enum['is-part-of'], 0],
							[predicates.enum['is-consistent-with'], 0],
							[predicates.enum['is-equivalent-to'], 0],
							[predicates.enum['is-inconsistent-with'], 0],
							[predicates.enum['contributes-to'], 0]
						])
					]
				]
			: []) as Array<[string, Map<string, number>]>),
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>)
	]);

	const customFacets = buildCategoryFacetsWithCounts(
		categoryContext.options,
		data ? Object.fromEntries(Object.entries(data)) : {}
	);
	for (const [key, values] of customFacets.entries()) {
		_facets.set(key, values);
	}

	_facets.set('programType', fromCounts(programTypes.options as string[], data?.programType));
	_facets.set('type', fromCounts(allTypeOptions, data?.type));

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext.labels,
		categoryOptions: categoryContext.options
	};
} satisfies PageServerLoad);
