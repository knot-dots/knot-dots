import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	inheritedGrantSetFor,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	predicates
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getAllRelatedUsers,
	getAllRelatedUsersByContainers,
	getContainerByGuid
} from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	const [container, grants, users] = await Promise.all([
		locals.pool.connect(
			getContainerByGuid(currentOrganizationalUnit?.guid ?? currentOrganization.guid)
		),
		locals.pool.connect(
			getAllGrantsByContainers([currentOrganizationalUnit?.guid ?? currentOrganization.guid])
		),
		locals.pool.connect(
			getAllRelatedUsers(currentOrganizationalUnit?.guid ?? currentOrganization.guid, [
				predicates.enum['is-member-of']
			])
		)
	]);

	if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (defineAbilityFor(locals.user).cannot('manage-users', container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const members = await getMembers(container.organization);

	// an organizational unit inherits its matrix from the organization, shown
	// with the same toggle as measures and programs
	let inherited;
	let inheritedUsers;
	if (isOrganizationalUnitContainer(container)) {
		const [scope, sourceGrants, sourceUsers] = await Promise.all([
			locals.pool.connect(getContainerByGuid(container.organization)),
			locals.pool.connect(getAllGrantsByContainers([container.organization])),
			locals.pool.connect(
				getAllRelatedUsersByContainers(
					[container.organization],
					[
						predicates.enum['is-admin-of'],
						predicates.enum['is-collaborator-of'],
						predicates.enum['is-head-of'],
						predicates.enum['is-member-of']
					]
				)
			)
		]);
		const areas = [{ guid: container.organization, grants: sourceGrants }];
		const inheritedGrants = sourceUsers.flatMap(({ guid: subject }) => {
			const set = inheritedGrantSetFor(subject, areas);
			return [
				...set.self.map((kind) => ({ kind, object: scope.guid, subject, target: 'self' as const })),
				...set.subordinates.map((kind) => ({
					kind,
					object: scope.guid,
					subject,
					target: 'subordinates' as const
				}))
			];
		});
		inherited = { grants: inheritedGrants, scope };
		inheritedUsers = sourceUsers.filter(({ guid }) =>
			inheritedGrants.some(({ subject }) => subject === guid)
		);
	}

	return {
		container,
		grants,
		...(inherited && inheritedUsers
			? { inheritedGrants: inherited.grants, inheritedUsers, scope: inherited.scope }
			: {}),
		users: users.map((u) => ({
			...u,
			email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
		}))
	};
}) satisfies PageServerLoad;
