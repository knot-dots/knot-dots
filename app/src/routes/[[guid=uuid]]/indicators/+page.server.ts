import { getIndicatorsData } from '$lib/load/indicators';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const { currentOrganization, currentOrganizationalUnit } = await parent();

	const result = await getIndicatorsData({
		organizationGuid: currentOrganization.guid,
		currentOrganizationalUnit: currentOrganizationalUnit ?? null,
		filters: {
			audience: url.searchParams.getAll('audience'),
			categories: url.searchParams.getAll('category'),
			indicatorCategories: url.searchParams.getAll('indicatorCategory'),
			indicatorTypes: url.searchParams.getAll('indicatorType'),
			policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
			topics: url.searchParams.getAll('topic'),
			included: url.searchParams.getAll('included')
		},
		user: locals.user,
		connect: locals.pool.connect
	});

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		useNewIndicators: result.useNewIndicators
	};
}) satisfies PageServerLoad;
