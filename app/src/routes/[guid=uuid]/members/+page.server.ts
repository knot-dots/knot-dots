import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	type Grant,
	grantSetForRole,
	grantSetForSubjectOn,
	grantSourceOf,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	memberRoles,
	predicates,
	type User
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getAllRelatedUsers,
	getAllRelatedUsersByContainers,
	getContainerByGuid
} from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

const userPredicates = [
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of'],
	predicates.enum['is-member-of']
];

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

	// an organizational unit inherits its matrices from the computed sources (a
	// decoupled parent unit or the organization), shown with the same sections
	// and toggle as measures and programs
	let inheritedSections:
		Array<{ scope: Container<AnyPayload>; grants: Grant[]; users: User[] }> | undefined;
	let admins: User[] | undefined;
	if (isOrganizationalUnitContainer(container)) {
		const inherits = !container.own_matrix;
		const sourceGuids = inherits
			? (container.user_grant?.sources ?? [container.organization])
			: [grantSourceOf(container)];
		const scopeGuids = [container.organization].filter((guid) => guid !== container.guid);
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
		container,
		grants,
		...(inheritedSections && admins
			? {
					admins,
					inheritedSections,
					mayManageOrganizationUsers:
						locals.user.isAuthenticated &&
						locals.user.grants.self['manage-users'].includes(container.organization)
				}
			: {}),
		title: unwrapFunctionStore(_)('members'),
		users: users.map((u) => ({
			...u,
			email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
		}))
	};
}) satisfies PageServerLoad;
