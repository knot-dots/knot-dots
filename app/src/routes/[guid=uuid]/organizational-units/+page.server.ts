import { error } from '@sveltejs/kit';
import { filterVisible } from '$lib/authorization';
import {
	type OrganizationalUnitContainer,
	computeFacetCount,
	administrativeTypes,
	fromCounts
} from '$lib/models';
import { getManyOrganizationalUnitContainers } from '$lib/server/db';
import { getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	let containers: OrganizationalUnitContainer[];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganization.payload.default) {
		error(404, 'No organizational units found');
	}

	if (currentOrganizationalUnit) {
		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({
				include: {
					administrativeType: url.searchParams.getAll('administrativeType'),
					cityAndMunicipalityTypeBBSR: url.searchParams.getAll('cityAndMunicipalityTypeBBSR'),
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
					federalState: url.searchParams.getAll('federalState'),
					level: 1,
					organization: currentOrganization.guid,
					terms: url.searchParams.get('terms') ?? ''
				}
			})
		);
	}

	const filtered = filterVisible(containers, locals.user);

	const features = createFeatureDecisions(locals.features);
	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		[
			'administrativeType',
			fromCounts(administrativeTypes.options as string[], data?.administrativeType)
		]
	]);

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, filtered);

	return { containers: filtered, facets };
}) satisfies PageServerLoad;
