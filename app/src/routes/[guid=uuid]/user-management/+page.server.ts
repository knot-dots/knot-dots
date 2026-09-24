import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findDescendants,
	type Grant,
	grantSetForSubjectOn,
	predicates,
	type User
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getAllRelatedUsersByContainers,
	getContainerByGuid
} from '$lib/server/db';
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

	const [members, relatedUsers, grants] = await Promise.all([
		getMembers(selectedContext.organization),
		locals.pool.connect(getAllRelatedUsersByContainers(displayedContainerGuids, userPredicates)),
		locals.pool.connect(getAllGrantsByContainers([selectedContext.guid]))
	]);

	const usersByGuid = new Map(relatedUsers.map((user) => [user.guid, user]));

	const withEmail = (user: User) => ({
		...user,
		email: members.find(({ id }) => id === user.guid)?.username ?? user.guid
	});

	// an organizational unit inherits its matrix from the organization, shown
	// with the same toggle as measures and programs
	let inheritedGrants: Grant[] | undefined;
	let inheritedUsers: User[] | undefined;
	let scope: Container<AnyPayload> | undefined;
	if (currentOrganizationalUnit) {
		const [organizationContainer, sourceGrants, sourceUsers] = await Promise.all([
			locals.pool.connect(getContainerByGuid(selectedContext.organization)),
			locals.pool.connect(getAllGrantsByContainers([selectedContext.organization])),
			locals.pool.connect(
				getAllRelatedUsersByContainers([selectedContext.organization], userPredicates)
			)
		]);
		scope = organizationContainer;
		inheritedGrants = sourceUsers.flatMap(({ guid: subject }) => {
			const set = grantSetForSubjectOn(sourceGrants, selectedContext.organization, subject);
			return [
				...set.self.map((kind) => ({
					kind,
					object: organizationContainer.guid,
					subject,
					target: 'self' as const
				})),
				...set.subordinates.map((kind) => ({
					kind,
					object: organizationContainer.guid,
					subject,
					target: 'subordinates' as const
				}))
			];
		});
		const rows = inheritedGrants;
		inheritedUsers = sourceUsers.filter(({ guid }) => rows.some(({ subject }) => subject === guid));
	}

	return {
		container: selectedContext,
		grants,
		...(inheritedGrants && inheritedUsers && scope
			? { inheritedGrants, inheritedUsers, scope }
			: {}),
		managedOrganizationalUnits,
		title: unwrapFunctionStore(_)('workspace.users.title'),
		users: [...usersByGuid.values()].map(withEmail)
	};
}) satisfies PageServerLoad;
