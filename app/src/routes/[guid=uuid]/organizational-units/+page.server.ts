import { error } from '@sveltejs/kit';
import { filterVisible } from '$lib/authorization';
import {
	type OrganizationalUnitContainer,
	computeFacetCount,
	administrativeTypes,
	fromCounts,
	payloadTypes
} from '$lib/models';
import { getManyOrganizationalUnitContainers } from '$lib/server/db';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	let containers: OrganizationalUnitContainer[];
	const {
		currentOrganization,
		currentOrganizationalUnit,
		categoryContext: rawCategoryContext
	} = await parent();

	const categoryContext = filterCategoryContext(rawCategoryContext, [
		payloadTypes.enum.organizational_unit
	]);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);
	if (currentOrganization.payload.default) {
		error(404, 'No organizational units found');
	}

	if (currentOrganizationalUnit) {
		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({
				include: {
					administrativeType: url.searchParams.getAll('administrativeType'),
					cityAndMunicipalityTypeBBSR: url.searchParams.getAll('cityAndMunicipalityTypeBBSR'),
					customCategories,
					federalState: url.searchParams.getAll('federalState'),
					level: currentOrganizationalUnit.payload.level + 1,
					organization: currentOrganization.guid,
					terms: url.searchParams.get('terms') ?? ''
				}
			})
		);
		containers = organizationalUnits.filter(({ relation }) =>
			relation.some(({ object }) => object == currentOrganizationalUnit.guid)
		);
	} else {
		containers = await locals.pool.connect(
			getManyOrganizationalUnitContainers({
				include: {
					administrativeType: url.searchParams.getAll('administrativeType'),
					cityAndMunicipalityTypeBBSR: url.searchParams.getAll('cityAndMunicipalityTypeBBSR'),
					customCategories,
					federalState: url.searchParams.getAll('federalState'),
					level: 1,
					organization: currentOrganization.guid,
					terms: url.searchParams.get('terms') ?? ''
				}
			})
		);
	}

	const filtered = filterVisible(containers, locals.user);
	const _facets = new Map<string, Map<string, number>>([
		['administrativeType', fromCounts(administrativeTypes.options as string[])],
		[
			'cityAndMunicipalityTypeBBSR',
			fromCounts([
				'Großstadt',
				'Mittelstadt',
				'Größere Kleinstadt',
				'Kleine Kleinstadt',
				'Landgemeinde'
			])
		],
		[
			'federalState',
			fromCounts([
				'Baden-Württemberg',
				'Bayern',
				'Berlin',
				'Brandenburg',
				'Bremen',
				'Hamburg',
				'Hessen',
				'Mecklenburg-Vorpommern',
				'Niedersachsen',
				'Nordrhein-Westfalen',
				'Rheinland-Pfalz',
				'Saarland',
				'Sachsen',
				'Sachsen-Anhalt',
				'Schleswig-Holstein',
				'Thüringen'
			])
		]
	]);

	if (categoryContext) {
		const customFacets = buildCategoryFacetsWithCounts(categoryContext.options);
		for (const [key, values] of customFacets.entries()) {
			_facets.set(key, values);
		}
	}

	const facets = computeFacetCount(_facets, filtered);

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext.labels,
		categoryOptions: categoryContext.options
	};
}) satisfies PageServerLoad;
