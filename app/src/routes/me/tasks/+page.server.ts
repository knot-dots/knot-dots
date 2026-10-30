import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import {
	isAssignedTo,
	isTaskContainer,
	computeFacetCount,
	fromCounts,
	taskCategories
} from '$lib/models';
import { getAllContainersRelatedToUser, getTeamGuidsOfUser } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const { containers, teams } = await locals.pool.connect(async (connection) => ({
		containers: await getAllContainersRelatedToUser(locals.user.guid)(connection),
		teams: await getTeamGuidsOfUser(locals.user.guid)(connection)
	}));

	const filtered = filterVisible(
		containers.filter(isTaskContainer).filter(isAssignedTo(locals.user, teams)),
		locals.user
	);

	const _facets = new Map<string, Map<string, number>>([
		['taskCategory', fromCounts(taskCategories.options as string[])]
	]);
	const facets = computeFacetCount(_facets, filtered);

	return {
		containers: filtered,
		facets,
		title: unwrapFunctionStore(_)('workspace.profile.tasks')
	};
};
