import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { isOrganizationalUnitContainer } from '$lib/models';
import { getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	if (!isOrganizationalUnitContainer(container)) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}
	return { container };
}) satisfies PageServerLoad;
