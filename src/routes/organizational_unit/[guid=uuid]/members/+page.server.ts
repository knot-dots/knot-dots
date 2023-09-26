import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { getAllRelatedUsers, getContainerByGuid } from '$lib/server/db';
import { isOrganizationalUnitContainer, predicates } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, parent }) => {
	const [container, users] = await Promise.all([
		locals.pool.connect(getContainerByGuid(params.guid)),
		locals.pool.connect(getAllRelatedUsers(params.guid, [predicates.enum['is-member-of']]))
	]);

	if (!isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	return { container, users };
}) satisfies PageServerLoad;
