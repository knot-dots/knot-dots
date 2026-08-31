import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { isOrganizationalUnitContainer, isOrganizationContainer, predicates } from '$lib/models';
import { getAllGrantsByContainers, getAllRelatedUsers, getContainerByGuid } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	const [container, users, grants] = await Promise.all([
		locals.pool.connect(
			getContainerByGuid(currentOrganizationalUnit?.guid ?? currentOrganization.guid)
		),
		locals.pool.connect(
			getAllRelatedUsers(currentOrganizationalUnit?.guid ?? currentOrganization.guid, [
				predicates.enum['is-member-of']
			])
		),
		locals.pool.connect(
			getAllGrantsByContainers([currentOrganizationalUnit?.guid ?? currentOrganization.guid])
		)
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
		grants,
		users: users.map((u) => ({
			...u,
			email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
		}))
	};
}) satisfies PageServerLoad;
