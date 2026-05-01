import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	type AnyContainer,
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	type OrganizationalUnitContainer,
	payloadTypes,
	predicates,
	programTypes
} from '$lib/models';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from '../../routes/[guid=uuid]/goals/$types';

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
	const features = createFeatureDecisions(locals.features);
	const categoryContext = filterCategoryContext(rawCategoryContext, [payloadTypes.enum.goal]);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = (await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		)) as OrganizationalUnitContainer[];
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(
				(unit: OrganizationalUnitContainer) =>
					unit.payload.level > currentOrganizationalUnit.payload.level
			)
			.map((unit: OrganizationalUnitContainer) => unit.guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relationType').length === 0
					? [
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-part-of']
						]
					: url.searchParams.getAll('relationType'),
				{
					customCategories,
					type: [payloadTypes.enum.goal]
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
					type: [payloadTypes.enum.goal]
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
					type: [payloadTypes.enum.goal]
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
						type: [payloadTypes.enum.goal]
					},
					url.searchParams.get('sort') ?? ''
				)
			);
		}
	}

	const filtered = filterOrganizationalUnits(
		filterVisible(
			containers.filter(
				(container: AnyContainer) =>
					!container.relation.some((rel) => rel.predicate === predicates.enum['is-part-of-measure'])
			),
			locals.user
		),
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
							[predicates.enum['is-inconsistent-with'], 0]
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

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return {
		containers: filtered,
		facets
	};
} satisfies PageServerLoad);
