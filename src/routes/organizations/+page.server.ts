import { filterVisible } from '$lib/authorization';
import { getManyOrganizationContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	const containers = await locals.pool.connect(
		getManyOrganizationContainers(
			{ default: false, organizationCategories: url.searchParams.getAll('organizationCategory') },
			url.searchParams.get('sort') ?? ''
		)
	);

	return { containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
