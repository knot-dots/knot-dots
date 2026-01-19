import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes } from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let containers;
	let subordinateOrganizationalUnits: string[] = [];
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	containers = await locals.pool.connect(
		getManyContainers(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{
				customCategories,
				measureTypes: url.searchParams.getAll('measureType'),
				template: true,
				terms: url.searchParams.get('terms') ?? '',
				type: [payloadTypes.enum.measure]
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
