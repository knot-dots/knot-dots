import type { DatabaseConnection } from 'slonik';
import {
	type AnyPayload,
	type Container,
	findAncestors,
	type Grant,
	grantSetForRole,
	grantSetForSubjectOn,
	type InheritedMatrixSection,
	isOrganizationalUnitContainer,
	matrixSectionScope,
	memberRoles,
	predicates,
	type TeamWithMembers,
	type User
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getAllRelatedUsersByContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	getManyTeamContainers,
	getTeamMembersByTeams
} from '$lib/server/db';

const userPredicates = [
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of'],
	predicates.enum['is-member-of']
];

// The teams of an organization along with their members, so the rows naming
// a team can open its roster.
export async function loadTeams(
	connection: DatabaseConnection,
	organization: string
): Promise<TeamWithMembers[]> {
	const teamContainers = await getManyTeamContainers({ organization })(connection);
	const membersByTeam = await getTeamMembersByTeams(teamContainers.map(({ guid }) => guid))(
		connection
	);
	return teamContainers.map((container) => ({
		container,
		members: membersByTeam.get(container.guid) ?? []
	}));
}

// The organizational units above a container, nearest first: the unit it
// belongs to (or the unit itself) and the units that one is part of.
async function unitChainOf(
	connection: DatabaseConnection,
	container: Container<AnyPayload>
): Promise<string[]> {
	const start = isOrganizationalUnitContainer(container)
		? container.guid
		: container.organizational_unit;
	if (!start) {
		return [];
	}
	const units = await getManyOrganizationalUnitContainers({
		include: { organization: [container.organization] }
	})(connection);
	const unit = units.find(({ guid }) => guid === start);
	return unit
		? [unit, ...findAncestors(unit, units, [predicates.enum['is-part-of']])].map(({ guid }) => guid)
		: [start];
}

/**
 * Loads what a permission matrix shows besides the container's own rows: the
 * administrators of the surrounding areas, who keep every kind regardless of
 * the sources and form a block of their own, and one section per governing
 * matrix (the read-time enrichment resolved the sources: the decoupled
 * ancestors, the organizational unit or the organization) with every other
 * subject's effective set materialized as rows on it. Subjects are the users
 * with a role on the matrices and the teams of the organization. The area a
 * decoupled container would fall back to once it inherits
 * (user_grant.dormant) keeps a dormant section.
 */
export async function loadMatrixSections(
	connection: DatabaseConnection,
	container: Container<AnyPayload>
): Promise<{
	admins: User[];
	adminTeams: TeamWithMembers[];
	inheritedSections: InheritedMatrixSection[];
	teams: TeamWithMembers[];
}> {
	const sourceGuids = (
		container.user_grant?.sources ?? [container.organizational_unit ?? container.organization]
	).filter((guid) => guid !== container.guid);
	// the organization scopes: the organization and the chain of units above
	// the container (its own unit and every unit that unit is part of) — the
	// same areas whose administrators computeUserGrants lets through
	const scopeGuids = [
		...new Set([container.organization, ...(await unitChainOf(connection, container))])
	].filter((guid) => guid !== container.guid);

	const dormantGuids = container.user_grant?.dormant ? [container.user_grant.dormant] : [];

	const sectionGuids = [...sourceGuids, ...dormantGuids];
	const matrixGuids = [...new Set([...sectionGuids, ...scopeGuids])];
	const sectionContainers: Container<AnyPayload>[] = [];
	for (const guid of sectionGuids) {
		sectionContainers.push(await getContainerByGuid(guid)(connection));
	}
	const matrixGrants = await getAllGrantsByContainers(matrixGuids)(connection);
	const matrixUsers = await getAllRelatedUsersByContainers(matrixGuids, userPredicates)(connection);
	const teams = await loadTeams(connection, container.organization);

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
	const admins = matrixUsers.filter(({ guid }) => isScopeAdmin(guid));
	const adminTeams = teams.filter(({ container }) => isScopeAdmin(container.guid));

	const subjects = [
		...matrixUsers.map(({ guid }) => guid),
		...teams.map(({ container }) => container.guid)
	].filter((subject) => !isScopeAdmin(subject));

	const inheritedSections = sectionContainers.map((scope) => {
		const sectionGrants: Grant[] = subjects.flatMap((subject) => {
			const set = grantSetForSubjectOn(matrixGrants, scope.guid, subject);
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
		const holdsRows = (subject: string) => sectionGrants.some((grant) => grant.subject === subject);
		return {
			active: !dormantGuids.includes(scope.guid),
			scope: matrixSectionScope(scope),
			grants: sectionGrants,
			teams: teams.filter(({ container }) => holdsRows(container.guid)),
			users: matrixUsers.filter(({ guid }) => holdsRows(guid))
		};
	});

	return { admins, adminTeams, inheritedSections, teams };
}
