import type { DatabaseConnection } from 'slonik';
import {
	type AnyPayload,
	type Container,
	type Grant,
	grantSetForRole,
	grantSetForSubjectOn,
	type InheritedMatrixSection,
	isOrganizationContainer,
	matrixSectionScope,
	memberRoles,
	predicates,
	type User
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getAllRelatedUsersByContainers,
	getContainerByGuid
} from '$lib/server/db';

const userPredicates = [
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of'],
	predicates.enum['is-member-of']
];

/**
 * Loads what a permission matrix shows besides the container's own rows: the
 * administrators of the surrounding areas, who keep every kind regardless of
 * the sources and form a block of their own, and one section per governing
 * matrix (the read-time enrichment resolved the sources: the decoupled
 * ancestors, the organizational unit or the organization) with every other
 * subject's effective set materialized as rows on it. A decoupled container
 * without decoupled ancestors stands on its own; its area (the unit with a
 * matrix of its own, else the organization) then keeps a dormant section,
 * since it applies again as soon as the container inherits.
 */
export async function loadMatrixSections(
	connection: DatabaseConnection,
	container: Container<AnyPayload>
): Promise<{ admins: User[]; inheritedSections: InheritedMatrixSection[] }> {
	const sourceGuids = (
		container.user_grant?.sources ?? [container.organizational_unit ?? container.organization]
	).filter((guid) => guid !== container.guid);
	const scopeGuids = [
		...new Set([
			container.organization,
			...(container.organizational_unit ? [container.organizational_unit] : [])
		])
	].filter((guid) => guid !== container.guid);

	const dormantGuids: string[] = [];
	if (container.own_matrix && sourceGuids.length === 0 && !isOrganizationContainer(container)) {
		const unit = container.organizational_unit
			? await getContainerByGuid(container.organizational_unit)(connection)
			: undefined;
		dormantGuids.push(unit?.own_matrix ? unit.guid : container.organization);
	}

	const sectionGuids = [...sourceGuids, ...dormantGuids];
	const matrixGuids = [...new Set([...sectionGuids, ...scopeGuids])];
	const sectionContainers: Container<AnyPayload>[] = [];
	for (const guid of sectionGuids) {
		sectionContainers.push(await getContainerByGuid(guid)(connection));
	}
	const matrixGrants = await getAllGrantsByContainers(matrixGuids)(connection);
	const matrixUsers = await getAllRelatedUsersByContainers(matrixGuids, userPredicates)(connection);

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

	const inheritedSections = sectionContainers.map((scope) => {
		const sectionGrants: Grant[] = matrixUsers
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
			active: !dormantGuids.includes(scope.guid),
			scope: matrixSectionScope(scope),
			grants: sectionGrants,
			users: matrixUsers.filter(({ guid }) => sectionGrants.some(({ subject }) => subject === guid))
		};
	});

	return { admins, inheritedSections };
}
