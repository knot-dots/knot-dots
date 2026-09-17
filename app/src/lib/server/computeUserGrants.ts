import { type DatabaseConnection, sql } from 'slonik';
import { z } from 'zod';
import { createFeatureDecisions } from '$lib/features';
import {
	composeUserGrants,
	type GrantKind,
	grantKinds,
	grantSetForRole,
	memberRoleFromPredicates,
	type Predicate,
	predicates,
	type UserGrants
} from '$lib/models';
import { applyComputedManagedBy } from '$lib/server/computeManagedBy';
import { getFeatures } from '$lib/server/features';
import { getRequestUser } from '$lib/server/requestUser';

// Structural relations along which grants are inherited from a container
// towards its ancestors (child.subject -> parent.object); the same chain
// computeManagedBy walks.
const hierarchyPredicates = [
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-section-of']
];

const row = z.object({
	guid: z.uuid(),
	source: z.uuid(),
	area_sourced: z.boolean(),
	place: z.enum(['source', 'organization', 'organizational_unit']),
	kind: grantKinds.nullable(),
	target: z.enum(['self', 'subordinates']).nullable()
});

/**
 * Computes the effective grants of one subject on the given containers: for
 * each container the matrix that governs it (its grant source) and the kinds
 * the subject holds there. The source is the container itself while its
 * matrix is decoupled (payload.inheritsGrants = false), otherwise the nearest
 * decoupled ancestor along the is-part-of chains, the container's
 * organizational unit if that has decoupled its matrix, and the organization
 * as the last resort — rows on inheriting containers lie dormant. Subjects
 * holding every self kind on the organization or on the container's
 * organizational unit act as administrators of that area and keep every kind
 * regardless of the source.
 */
export async function computeUserGrants(
	connection: DatabaseConnection,
	subject: string,
	guids: string[]
): Promise<Map<string, UserGrants>> {
	if (guids.length === 0) {
		return new Map();
	}

	// The correlated ARRAY subselect keeps the recursive part on cheap per-row
	// index probes; see computeManagedBy for the reasoning and why the pool
	// disables JIT.
	const rows = await connection.any(sql.type(row)`
		WITH RECURSIVE ancestry(root, guid, depth, path, is_cycle) AS (
			SELECT g::uuid, g::uuid, 0, ARRAY[g::uuid], false
			FROM unnest(${sql.array(guids, 'uuid')}) AS g
			UNION ALL
			SELECT a.root, parent.object, a.depth + 1, array_append(a.path, parent.object), parent.object = ANY(a.path)
			FROM ancestry a
			CROSS JOIN LATERAL unnest(ARRAY(
				SELECT cr.object
				FROM container_relation cr
				WHERE cr.subject = a.guid
					AND cr.predicate = ANY(${sql.array(hierarchyPredicates, 'text')})
					AND cr.valid_currently
					AND NOT cr.deleted
			)) AS parent(object)
			WHERE NOT a.is_cycle
		),
		base AS (
			SELECT c.guid AS root, c.organization, c.organizational_unit,
				coalesce(c.payload->>'inheritsGrants', 'true') = 'false' AS decoupled
			FROM container c
			WHERE c.guid = ANY(${sql.array(guids, 'uuid')}) AND c.valid_currently AND NOT c.deleted
		),
		source AS (
			SELECT b.root,
				CASE WHEN b.decoupled THEN b.root ELSE coalesce(
					(
						SELECT a.guid
						FROM ancestry a
						JOIN container c ON c.guid = a.guid AND c.valid_currently AND NOT c.deleted
						WHERE a.root = b.root AND a.depth > 0
							AND c.payload->>'inheritsGrants' = 'false'
						ORDER BY a.depth ASC, a.guid ASC
						LIMIT 1
					),
					(
						SELECT u.guid
						FROM container u
						WHERE u.guid = b.organizational_unit AND u.valid_currently AND NOT u.deleted
							AND u.payload->>'inheritsGrants' = 'false'
					),
					b.organization
				) END AS source
			FROM base b
		)
		SELECT b.root AS guid, s.source,
			s.source = b.organization OR coalesce(s.source = b.organizational_unit, false) AS area_sourced,
			p.place, g.kind, g.target
		FROM base b
		JOIN source s ON s.root = b.root
		CROSS JOIN LATERAL (
			VALUES
				('source', s.source),
				('organization', b.organization),
				('organizational_unit', b.organizational_unit)
		) AS p(place, object)
		LEFT JOIN container_grant g ON g.object = p.object AND g.subject = ${subject}
		WHERE p.object IS NOT NULL
	`);

	const result = new Map<string, UserGrants>();

	for (const guid of new Set(rows.map((r) => r.guid))) {
		const forGuid = rows.filter((r) => r.guid === guid);
		const { source, area_sourced } = forGuid[0];
		const kindsAt = (place: string, target: string) =>
			forGuid
				.filter((r) => r.place === place && r.target === target && r.kind !== null)
				.map((r) => r.kind as GrantKind);

		result.set(
			guid,
			composeUserGrants({
				areaSourced: area_sourced,
				governsItself: source === guid,
				organizationSelf: kindsAt('organization', 'self'),
				organizationalUnitSelf: kindsAt('organizational_unit', 'self'),
				source,
				sourceSelf: kindsAt('source', 'self'),
				sourceSubordinates: kindsAt('source', 'subordinates')
			})
		);
	}

	return result;
}

const roleRow = z.object({
	guid: z.uuid(),
	place: z.enum(['team', 'organization', 'organizational_unit']),
	object: z.uuid(),
	predicate: z.string()
});

// Membership relations that make a container a team of its own — the same
// criteria computeManagedBy uses.
const rolePredicates = ['is-admin-of', 'is-collaborator-of', 'is-head-of', 'is-member-of'];

/**
 * The role-based counterpart of computeUserGrants, in effect while the
 * permission matrix is off: the subject's grants follow from its member roles
 * on the nearest team along the is-part-of chains and on the container's
 * areas, additively — the pre-matrix behavior. Stored grant rows lie dormant.
 */
export async function computeUserGrantsFromRoles(
	connection: DatabaseConnection,
	subject: string,
	guids: string[]
): Promise<Map<string, UserGrants>> {
	if (guids.length === 0) {
		return new Map();
	}

	const rows = await connection.any(sql.type(roleRow)`
		WITH RECURSIVE ancestry(root, guid, depth, path, is_cycle) AS (
			SELECT g::uuid, g::uuid, 0, ARRAY[g::uuid], false
			FROM unnest(${sql.array(guids, 'uuid')}) AS g
			UNION ALL
			SELECT a.root, parent.object, a.depth + 1, array_append(a.path, parent.object), parent.object = ANY(a.path)
			FROM ancestry a
			CROSS JOIN LATERAL unnest(ARRAY(
				SELECT cr.object
				FROM container_relation cr
				WHERE cr.subject = a.guid
					AND cr.predicate = ANY(${sql.array(hierarchyPredicates, 'text')})
					AND cr.valid_currently
					AND NOT cr.deleted
			)) AS parent(object)
			WHERE NOT a.is_cycle
		),
		teamed AS (
			SELECT DISTINCT ON (a.root) a.root, a.guid
			FROM ancestry a
			JOIN container c ON c.guid = a.guid AND c.valid_currently AND NOT c.deleted
			WHERE EXISTS (
				SELECT 1 FROM container_user cu
				WHERE cu.object = c.revision AND cu.predicate = ANY(${sql.array(rolePredicates, 'text')})
			)
			ORDER BY a.root, a.depth ASC, a.guid ASC
		),
		base AS (
			SELECT c.guid AS root, c.organization, c.organizational_unit
			FROM container c
			WHERE c.guid = ANY(${sql.array(guids, 'uuid')}) AND c.valid_currently AND NOT c.deleted
		)
		SELECT b.root AS guid, p.place, p.object, cu.predicate
		FROM base b
		LEFT JOIN teamed t ON t.root = b.root
		CROSS JOIN LATERAL (
			VALUES
				('team', t.guid),
				('organization', b.organization),
				('organizational_unit', b.organizational_unit)
		) AS p(place, object)
		JOIN container c ON c.guid = p.object AND c.valid_currently AND NOT c.deleted
		JOIN container_user cu ON cu.object = c.revision AND cu.subject = ${subject}
			AND cu.predicate = ANY(${sql.array(rolePredicates, 'text')})
	`);

	const result = new Map<string, UserGrants>();

	for (const guid of guids) {
		const forGuid = rows.filter((r) => r.guid === guid);
		const setAt = (place: string) => {
			const role = memberRoleFromPredicates(
				forGuid.filter((r) => r.place === place).map(({ predicate }) => predicate as Predicate)
			);
			return role === null ? { self: [], subordinates: [] } : grantSetForRole(role);
		};

		const team = forGuid.find((r) => r.place === 'team');
		const teamSet = setAt('team');
		const organizationSet = setAt('organization');
		const unitSet = setAt('organizational_unit');

		// the pre-matrix rules are additive: the team's roles and the roles on
		// the surrounding areas apply side by side
		const union = (target: 'self' | 'subordinates') =>
			grantKinds.options.filter((kind) =>
				[teamSet, organizationSet, unitSet].some((set) => set[target].includes(kind))
			);

		const subordinates = union('subordinates');
		const governsItself = team?.object === guid;
		result.set(guid, {
			admin: [teamSet, organizationSet, unitSet].some((set) =>
				['read', 'update', 'manage-users'].every((kind) => (set.self as string[]).includes(kind))
			),
			area_sourced: team === undefined,
			member: team
				? teamSet.subordinates.includes(grantKinds.enum.read)
				: subordinates.includes(grantKinds.enum.read),
			organization_manager: organizationSet.self.includes(grantKinds.enum['manage-users']),
			own: governsItself ? teamSet.self : [],
			self: subordinates.filter((kind) => kind !== grantKinds.enum.create),
			source: team?.object ?? forGuid[0]?.object ?? guid,
			subordinates
		});
	}

	return result;
}

type UserGrantsComparable = {
	guid: string;
	user_grants?: UserGrants;
};

/**
 * Attaches the effective grants of the given subject to the containers as
 * `user_grants`, computed at read time and never stored. The property is
 * specific to the authenticated user of the request; grants of other subjects
 * do not leave the server. Without a subject (anonymous requests) it is a
 * no-op and only the visibility rules apply.
 */
export async function applyUserGrants<T extends UserGrantsComparable>(
	connection: DatabaseConnection,
	subject: string,
	containers: T[]
): Promise<T[]> {
	if (subject === '' || containers.length === 0) {
		return containers;
	}

	// while the permission matrix is off, the member roles govern instead of
	// the stored grant rows — the same switch the session applies
	const compute = createFeatureDecisions(getFeatures()).usePermissionMatrix()
		? computeUserGrants
		: computeUserGrantsFromRoles;
	const computed = await compute(
		connection,
		subject,
		containers.map(({ guid }) => guid)
	);

	for (const container of containers) {
		const value = computed.get(container.guid);
		if (value !== undefined) {
			container.user_grants = value;
		}
	}

	return containers;
}

type Enrichable = UserGrantsComparable & Parameters<typeof applyComputedManagedBy>[1][number];

/**
 * The read-time enrichment pipeline of the read paths: computes managed_by
 * (behind its feature flag) and attaches the effective grants of the request
 * user. Outside a request there is no user and the grants step is a no-op.
 */
export async function enrichContainers<T extends Enrichable>(
	connection: DatabaseConnection,
	containers: T[]
): Promise<T[]> {
	return applyUserGrants(
		connection,
		getRequestUser(),
		await applyComputedManagedBy(connection, containers)
	);
}
