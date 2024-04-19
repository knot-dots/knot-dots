import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes } from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let subordinateOrganizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	const containers = await locals.pool.connect(
		getManyContainers(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{
				categories: url.searchParams.getAll('category'),
				topics: url.searchParams.getAll('topic'),
				terms: url.searchParams.get('terms') ?? '',
				type: [
					payloadTypes.enum.indicator,
					payloadTypes.enum.measure,
					payloadTypes.enum['internal_objective.milestone'],
					payloadTypes.enum['internal_objective.task']
				]
			},
			url.searchParams.get('sort') ?? ''
		)
	);

	return {
		containers: filterOrganizationalUnits(
			filterVisible(containers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		)
	};
}) satisfies PageServerLoad;
