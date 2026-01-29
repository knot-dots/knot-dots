import { error } from '@sveltejs/kit';
import { filterVisible } from '$lib/authorization';
import type { OrganizationalUnitContainer } from '$lib/models';
import { getManyOrganizationalUnitContainers } from '$lib/server/db';
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

	return { containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
