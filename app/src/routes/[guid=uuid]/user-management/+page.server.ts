import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { findDescendants, predicates, type User } from '$lib/models';
import { getAllRelatedUsersByContainers } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

const userPredicates = [
	predicates.enum['is-member-of'],
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of']
];

export const load = (async ({ locals, parent }) => {
	const {
		currentOrganization,
		currentOrganizationalUnit,
		organizationalUnits: parentOrganizationalUnits
	} = await parent();
	const selectedContext = currentOrganizationalUnit ?? currentOrganization;

	if (
		!locals.user.roles.includes('sysadmin') &&
		!locals.user.adminOf.includes(selectedContext.guid)
	) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const organizationalUnits = currentOrganizationalUnit
		? findDescendants(currentOrganizationalUnit, parentOrganizationalUnits, [
				predicates.enum['is-part-of']
			])
		: parentOrganizationalUnits.filter(
				({ organization }) => organization === currentOrganization.guid
			);

	const displayedContainerGuids = [
		...new Set([selectedContext.guid, ...organizationalUnits.map(({ guid }) => guid)])
	];

	const [members, relatedUsers] = await Promise.all([
		getMembers(selectedContext.organization),
		locals.pool.connect(getAllRelatedUsersByContainers(displayedContainerGuids, userPredicates))
	]);

	const usersByGuid = new Map(relatedUsers.map((user) => [user.guid, user]));

	const withEmail = (user: User) => ({
		...user,
		email: members.find(({ id }) => id === user.guid)?.username ?? user.guid
	});

	return {
		container: selectedContext,
		organizationalUnits,
		users: [...usersByGuid.values()].map(withEmail)
	};
}) satisfies PageServerLoad;
