import { filterVisible } from '$lib/authorization';
import { audience, type IndicatorContainer, indicatorTypes, payloadTypes } from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	let containers;

	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (url.searchParams.getAll('included').includes('all-organizational-units')) {
		containers = await locals.pool.connect(
			getManyContainers([currentOrganization.guid], { type: [payloadTypes.enum.indicator] }, '')
		);
	} else {
		let organizationalUnits: string[] = [];
		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			organizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}
		containers = await locals.pool.connect(
			getManyContainers(
				[currentOrganization.guid],
				{
					audience: url.searchParams.has('audienceChanged')
						? url.searchParams.getAll('audience')
						: [audience.enum['audience.public'], audience.enum['audience.organization']],
					categories: url.searchParams.getAll('category'),
					indicatorCategories: url.searchParams.getAll('indicatorCategory'),
					indicatorTypes: url.searchParams.has('indicatorTypeChanged')
						? url.searchParams.getAll('indicatorType')
						: [indicatorTypes.enum['indicator_type.performance']],
					organizationalUnits,
					topics: url.searchParams.getAll('topic'),
					type: [payloadTypes.enum.indicator]
				},
				''
			)
		);
	}

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: filterVisible(containers, locals.user) as IndicatorContainer[]
	};
}) satisfies PageServerLoad;
