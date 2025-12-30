import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes } from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let containers;
	let subordinateOrganizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const features = createFeatureDecisions(locals.features);

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	containers = await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						measureTypes: url.searchParams.getAll('measureType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						template: true,
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.measure]
					},
					url.searchParams.get('sort') ?? ''
				)
			: getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						measureTypes: url.searchParams.getAll('measureType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						template: true,
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.measure]
					},
					url.searchParams.get('sort') ?? ''
				)
	);

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit
	);

	const facets = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: {};

	return {
		containers: filtered,
		facets
	};
}) satisfies PageServerLoad;
