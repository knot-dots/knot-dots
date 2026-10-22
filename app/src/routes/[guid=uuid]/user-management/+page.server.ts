import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { findDescendants, predicates, type User } from '$lib/models';
import { getAllGrantsByContainers, getAllRelatedUsersByContainers } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import { loadMatrixSections } from '$lib/server/matrixSections';
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

	if (defineAbilityFor(locals.user).cannot('manage-users', selectedContext)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const managedOrganizationalUnits = currentOrganizationalUnit
		? findDescendants(currentOrganizationalUnit, parentOrganizationalUnits, [
				predicates.enum['is-part-of']
			])
		: parentOrganizationalUnits.filter(
				({ organization }) => organization === currentOrganization.guid
			);

	const displayedContainerGuids = [
		...new Set([selectedContext.guid, ...managedOrganizationalUnits.map(({ guid }) => guid)])
	];

	// an organizational unit inherits its matrices from the computed sources
	// (a decoupled parent unit or the organization), shown with the same
	// sections and toggle as measures and programs
	const [members, { grants, relatedUsers, sections }] = await Promise.all([
		getMembers(selectedContext.organization),
		locals.pool.connect(async (connection) => ({
			grants: await getAllGrantsByContainers([selectedContext.guid])(connection),
			relatedUsers: await getAllRelatedUsersByContainers(
				displayedContainerGuids,
				userPredicates
			)(connection),
			sections: currentOrganizationalUnit
				? await loadMatrixSections(connection, currentOrganizationalUnit)
				: undefined
		}))
	]);

	const usersByGuid = new Map(relatedUsers.map((user) => [user.guid, user]));

	const withEmail = (user: User) => ({
		...user,
		email: members.find(({ id }) => id === user.guid)?.username ?? user.guid
	});

	return {
		container: selectedContext,
		grants,
		...(sections
			? {
					...sections,
					mayManageOrganizationUsers: defineAbilityFor(locals.user).can(
						'manage-users',
						currentOrganization
					)
				}
			: {}),
		managedOrganizationalUnits,
		title: unwrapFunctionStore(_)('workspace.users.title'),
		users: [...usersByGuid.values()].map(withEmail)
	};
}) satisfies PageServerLoad;
