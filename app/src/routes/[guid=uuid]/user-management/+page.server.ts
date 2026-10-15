import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findDescendants,
	type Grant,
	grantSetForRole,
	grantSetForSubjectOn,
	grantSourceOf,
	memberRoles,
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

	// an organizational unit inherits its matrices from the computed sources
	// (a decoupled parent unit or the organization), shown with the same
	// sections and toggle as measures and programs
	let inheritedSections:
		Array<{ scope: Container<AnyPayload>; grants: Grant[]; users: User[] }> | undefined;
	let admins: User[] | undefined;
	if (currentOrganizationalUnit) {
		const inherits = !selectedContext.own_matrix;
		const sourceGuids = inherits
			? (selectedContext.user_grant?.sources ?? [selectedContext.organization])
			: [grantSourceOf(selectedContext)];
		const scopeGuids = [selectedContext.organization].filter(
			(guid) => guid !== selectedContext.guid
		);
		const matrixGuids = [...new Set([...sourceGuids, ...scopeGuids])];

		const [sourceContainers, matrixGrants, matrixUsers] = await Promise.all([
			Promise.all(
				sourceGuids.map((sourceGuid) => locals.pool.connect(getContainerByGuid(sourceGuid)))
			),
			locals.pool.connect(getAllGrantsByContainers(matrixGuids)),
			locals.pool.connect(getAllRelatedUsersByContainers(matrixGuids, userPredicates))
		]);

		// organization administrators keep every kind regardless of the sources;
		// they form a block of their own, so the sections leave them out
		const administratorSet = grantSetForRole(memberRoles.enum.administrator);
		const isScopeAdmin = (subject: string) =>
			scopeGuids.some((area) =>
				administratorSet.self.every((kind) =>
					matrixGrants.some(
						(grant) =>
							grant.object === area &&
							grant.subject === subject &&
							grant.target === 'self' &&
							grant.kind === kind
					)
				)
			);
		admins = matrixUsers.filter(({ guid }) => isScopeAdmin(guid));

		inheritedSections = sourceContainers.map((scope) => {
			const sectionGrants = matrixUsers
				.filter(({ guid }) => !isScopeAdmin(guid))
				.flatMap(({ guid: subject }) => {
					const set = grantSetForSubjectOn(matrixGrants, scope.guid, subject);
					return [
						...set.self.map((kind) => ({
							kind,
							object: scope.guid,
							subject,
							target: 'self' as const
						})),
						...set.subordinates.map((kind) => ({
							kind,
							object: scope.guid,
							subject,
							target: 'subordinates' as const
						}))
					];
				});
			return {
				scope,
				grants: sectionGrants,
				users: matrixUsers.filter(({ guid }) =>
					sectionGrants.some(({ subject }) => subject === guid)
				)
			};
		});
	}

	return {
		container: selectedContext,
		grants,
		...(inheritedSections && admins
			? {
					admins,
					inheritedSections,
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
