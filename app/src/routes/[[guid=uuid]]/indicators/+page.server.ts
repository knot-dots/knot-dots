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

	let containers;
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

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(
			containers,
			url.searchParams.getAll('included').includes('all_organizational_units')
				? {}
				: { organizationalUnits }
		)
	);

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: filterVisible([...containers, ...relatedContainers], locals.user)
	};
}) satisfies PageServerLoad;
