import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { findDescendants, predicates } from '$lib/models';
import { getAllRelatedUsers, getAllRelatedUsersByContainers } from '$lib/server/db';
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

	const [members, organizationalUnitUsers] = await Promise.all([
		getMembers(selectedContext.organization),
		locals.pool.connect(
			getAllRelatedUsersByContainers(
				organizationalUnits.map(({ guid }) => guid),
				userPredicates
			)
		)
	]);

	const users = await locals.pool.connect(getAllRelatedUsers(selectedContext.guid, userPredicates));

	const usersByContainer = new Map<string, (typeof users)[number][]>();
	for (const { container, user } of organizationalUnitUsers) {
		const group = usersByContainer.get(container) ?? [];
		group.push(user);
		usersByContainer.set(container, group);
	}

	const withEmail = (user: (typeof users)[number]) => ({
		...user,
		email: members.find(({ id }) => id === user.guid)?.username ?? user.guid
	});

	return {
		container: selectedContext,
		organizationalUnits: organizationalUnits.map((container) => ({
			container,
			users: (usersByContainer.get(container.guid) ?? []).map(withEmail)
		})),
		users: users.map(withEmail)
	};
}) satisfies PageServerLoad;
