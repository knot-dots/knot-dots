import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import {
	computeFacetCount,
	fromCounts,
	indicatorCategories,
	type IndicatorTemplateContainer,
	indicatorTypes,
	payloadTypes
} from '$lib/models';
import { getAllContainersRelatedToIndicatorTemplates, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();
	const features = createFeatureDecisions(locals.features);
	const categoryContext = filterCategoryContext(rawCategoryContext, [
		payloadTypes.enum.objective,
		payloadTypes.enum.effect,
		payloadTypes.enum.indicator_template
	]);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

	let containers: IndicatorTemplateContainer[];
	let data: Record<string, Record<string, number>> | undefined;
	if (features.useElasticsearch()) {
		const esResult = await getManyContainersWithES(
			[],
			{
				customCategories,
				indicatorCategories: url.searchParams.getAll('indicatorCategory'),
				indicatorTypes: url.searchParams.getAll('indicatorType'),
				type: [payloadTypes.enum.indicator_template]
			},
			'',
			{ customCategoryKeys: categoryContext.keys, includeFacets: true }
		);
		containers = esResult.containers as IndicatorTemplateContainer[];
		data = esResult.facets;
	} else {
		containers = (await locals.pool.connect(
			getManyContainers(
				[],
				{
					customCategories,
					indicatorCategories: url.searchParams.getAll('indicatorCategory'),
					indicatorTypes: url.searchParams.getAll('indicatorType'),
					type: [payloadTypes.enum.indicator_template]
				},
				''
			)
		)) as IndicatorTemplateContainer[];
	}

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicatorTemplates(
			containers,
			{ organizations: [currentOrganization.guid] },
			{
				organizations: [currentOrganization.guid],
				organizationalUnits: currentOrganizationalUnit ? [currentOrganizationalUnit.guid] : null
			}
		)
	);

	const filtered = filterVisible([...containers, ...relatedContainers], locals.user);

	const _facets = new Map<string, Map<string, number>>([
		['indicatorType', fromCounts(indicatorTypes.options as string[], data?.indicatorType)],
		[
			'indicatorCategory',
			fromCounts(indicatorCategories.options as string[], data?.indicatorCategory)
		]
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

	const facets =
		features.useElasticsearch() && data ? _facets : computeFacetCount(_facets, filtered);

	return {
		container: currentOrganization,
		containers: filtered,
		facets
	};
}) satisfies PageServerLoad;
