import { filterVisible } from '$lib/authorization';
import { type IndicatorContainer, payloadTypes } from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let containers: IndicatorContainer[];
	let organizationalUnits: string[] = [];

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

	if (url.searchParams.getAll('included').includes('all-organizational-units')) {
		containers = (await locals.pool.connect(
			getManyContainers([currentOrganization.guid], { type: [payloadTypes.enum.indicator] }, '')
		)) as IndicatorContainer[];
	} else {
		containers = (await locals.pool.connect(
			getManyContainers(
				[currentOrganization.guid],
				{
					audience: url.searchParams.getAll('audience'),
					categories: url.searchParams.getAll('category'),
					indicatorCategories: url.searchParams.getAll('indicatorCategory'),
					indicatorTypes: url.searchParams.getAll('indicatorType'),
					organizationalUnits,
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					topics: url.searchParams.getAll('topic'),
					type: [payloadTypes.enum.indicator]
				},
				''
			)
		)) as IndicatorContainer[];
	}

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(containers, { organizationalUnits })
	);

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: filterVisible(
			[...containers, ...relatedContainers],
			locals.user
		) as IndicatorContainer[]
	};
}) satisfies PageServerLoad;
