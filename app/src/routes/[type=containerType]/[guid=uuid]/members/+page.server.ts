import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { isOrganizationalUnitContainer, isOrganizationContainer, predicates } from '$lib/models';
import { getAllRelatedUsers, getContainerByGuid } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	const [container, users] = await Promise.all([
		locals.pool.connect(getContainerByGuid(params.guid)),
		locals.pool.connect(getAllRelatedUsers(params.guid, [predicates.enum['is-member-of']]))
	]);

	if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (defineAbilityFor(locals.user).cannot('invite-members', container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const members = await getMembers(container.organization);

	return {
		container,
		users: users.map((u) => ({
			...u,
			email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
		}))
	};
}) satisfies PageServerLoad;
