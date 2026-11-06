import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { isTeamContainer, predicates, type User } from '$lib/models';
import { getAllRelatedUsers } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

// A team as its own page or overlay: the roster of the unit marked as a team,
// along with the area it belongs to (the unit it is part of, else the
// organization). Editing follows manage-users on the team, which the
// administrators of the units above and of the organization hold as well.
export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit, organizationalUnits } = await parent();
	const container = currentOrganizationalUnit;

	if (!container || !isTeamContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const ability = defineAbilityFor(locals.user);

	if (ability.cannot('read', container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	// the addresses come along for those managing the team only; everyone
	// else allowed to read the unit sees the names
	const mayManage = ability.can('manage-users', container);

	const [members, users] = await Promise.all([
		mayManage ? getMembers(container.organization) : [],
		locals.pool.connect(getAllRelatedUsers(container.guid, [predicates.enum['is-member-of']]))
	]);

	const parentGuid = container.relation.find(
		({ predicate, subject }) =>
			predicate === predicates.enum['is-part-of'] && subject === container.guid
	)?.object;
	const parentUnit = organizationalUnits.find(({ guid }) => guid === parentGuid);

	const withEmail = (user: User) =>
		mayManage
			? { ...user, email: members.find(({ id }) => id === user.guid)?.username ?? user.guid }
			: user;

	return {
		container,
		mayManage,
		parent: parentUnit
			? { guid: parentUnit.guid, name: parentUnit.payload.name }
			: { guid: currentOrganization.guid, name: currentOrganization.payload.name },
		title: unwrapFunctionStore(_)('members'),
		users: users.map(withEmail)
	};
}) satisfies PageServerLoad;
