import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import { type IndicatorContainer, payloadTypes } from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers,
	getFacetAggregationsForGuids
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let containers;
	let organizationalUnits: string[] = [];
	let relatedContainers;
	let useNewIndicators = false;

	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid)
			.concat(currentOrganizationalUnit.guid);
	}

	containers = (await locals.pool.connect(
		getManyContainers(
			[currentOrganization.guid],
			{
				audience: url.searchParams.getAll('audience'),
				categories: url.searchParams.getAll('category'),
				indicatorCategories: url.searchParams.getAll('indicatorCategory'),
				indicatorTypes: url.searchParams.getAll('indicatorType'),
				...(url.searchParams.getAll('included').includes('all_organizational_units')
					? undefined
					: { organizationalUnits }),
				policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
				topics: url.searchParams.getAll('topic'),
				type: [payloadTypes.enum.indicator]
			},
			'alpha'
		)
	)) as IndicatorContainer[];

	relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(
			containers,
			url.searchParams.getAll('included').includes('all_organizational_units')
				? {}
				: { organizationalUnits }
		)
	);

	if (containers.length == 0) {
		useNewIndicators = true;

		[containers, relatedContainers] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					[],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						indicatorCategories: url.searchParams.getAll('indicatorCategory'),
						indicatorTypes: url.searchParams.getAll('indicatorType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						type: [payloadTypes.enum.indicator_template]
					},
					'alpha'
				)
			),
			locals.pool.connect(
				getManyContainers(
					[currentOrganization.guid],
					{
						organizationalUnits: currentOrganizationalUnit ? [currentOrganizationalUnit.guid] : [],
						type: [payloadTypes.enum.actual_data]
					},
					'alpha'
				)
			)
		]);
	}

	const filtered = filterVisible([...containers, ...relatedContainers], locals.user);
	const features = createFeatureDecisions(locals.features);
	const facets = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: {};

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: filtered,
		facets,
		useNewIndicators
	};
}) satisfies PageServerLoad;
