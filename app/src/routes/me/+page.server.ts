import { filterVisible } from '$lib/authorization';
import { getAllContainersRelatedToUser, getTeamGuidsOfUser } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const { containers, teams } = await locals.pool.connect(async (connection) => ({
		containers: await getAllContainersRelatedToUser(locals.user.guid)(connection),
		teams: await getTeamGuidsOfUser(locals.user.guid)(connection)
	}));

	return {
		containers: filterVisible(containers, locals.user),
		teams,
		title: unwrapFunctionStore(_)('workspace.profile')
	};
};
