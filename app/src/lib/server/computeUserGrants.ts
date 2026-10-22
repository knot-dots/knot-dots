import { type DatabaseConnection, sql } from 'slonik';
import { z } from 'zod';
import { createFeatureDecisions } from '$lib/features';
import {
	composeUserGrants,
	type GrantKind,
	grantKinds,
	grantSetForRole,
	memberRoleFromPredicates,
	organizationalUnitType,
	payloadTypes,
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

// Area sources rank behind every hierarchy chain: the units above, nearest
// first, then the organization.
const unitSourceOrd = 1000000000;

const row = z.object({
	guid: z.uuid(),
	object: z.uuid(),
	ord: z.number().int().nullable(),
	place: z.enum(['source', 'dormant', 'organization', 'organizational_unit']),
	kind: grantKinds.nullable(),
	target: z.enum(['self', 'subordinates']).nullable()
});

/**
 * Computes the effective grants of one subject on the given containers: for
 * each container the matrices that govern it (its grant sources) and the
 * kinds the subject holds there. The matrices accumulate up the hierarchy,
 * nearest first: the container's own matrix while decoupled (own_matrix),
 * then every decoupled ancestor along every chain. Only an inheriting
 * container whose chains reach the top without any decoupled ancestor falls
 * back to its area: the organizational units above it that have decoupled
 * their matrices, nearest first, or the organization as the last resort — a
 * unit's matrix governs the contents of the units below it. A decoupled
 * ancestor thus replaces the area matrices, never the matrices below or above
 * it. The sources' rows apply side by side; rows on inheriting containers in
 * between lie dormant. Subjects holding every self kind on the organization
 * or on one of the container's units act as administrators of that scope and
 * keep every kind regardless of the sources.
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
	// disables JIT. The walk visits the whole ancestry (per-row EXISTS probe
	// for decoupling) and remembers per path whether a decoupled ancestor
	// has been passed (shielded), which decides the scope fallback.
	const rows = await connection.any(sql.type(row)`
		WITH RECURSIVE ancestry(root, guid, depth, path, is_cycle, decoupled, shielded) AS (
			SELECT g::uuid, g::uuid, 0, ARRAY[g::uuid], false,
				EXISTS (
					SELECT 1 FROM container c
					WHERE c.guid = g::uuid AND c.valid_currently AND NOT c.deleted AND c.own_matrix
				),
				false
			FROM unnest(${sql.array(guids, 'uuid')}) AS g
			UNION ALL
			SELECT a.root, parent.object, a.depth + 1, array_append(a.path, parent.object),
				parent.object = ANY(a.path), d.decoupled, a.shielded OR d.decoupled
			FROM ancestry a
			CROSS JOIN LATERAL unnest(ARRAY(
				SELECT cr.object
				FROM container_relation cr
				WHERE cr.subject = a.guid
					AND cr.predicate = ANY(${sql.array(hierarchyPredicates, 'text')})
					AND cr.valid_currently
					AND NOT cr.deleted
			)) AS parent(object)
			CROSS JOIN LATERAL (
				SELECT EXISTS (
					SELECT 1 FROM container c
					WHERE c.guid = parent.object AND c.valid_currently AND NOT c.deleted AND c.own_matrix
				) AS decoupled
			) d
			WHERE NOT a.is_cycle
		),
		-- The subject holds the rows of its teams (units marked as such) as
		-- well; materialized once,
		-- the semi-join below hashes a handful of rows rather than probing per
		-- place row.
		subjects AS MATERIALIZED (
			SELECT ${subject}::uuid AS subject
			UNION
			SELECT t.guid
			FROM container_user cu
			JOIN container t ON t.revision = cu.object
				AND t.valid_currently AND NOT t.deleted
				AND t.payload->>'type' = ${payloadTypes.enum.organizational_unit}
				AND t.payload->>'organizationalUnitType' = ${organizationalUnitType.enum['organizational_unit_type.team']}
			WHERE cu.subject = ${subject} AND cu.predicate = ${predicates.enum['is-member-of']}
		),
		base AS (
			SELECT c.guid AS root, c.organization, c.organizational_unit,
				c.own_matrix AS decoupled
			FROM container c
			WHERE c.guid = ANY(${sql.array(guids, 'uuid')}) AND c.valid_currently AND NOT c.deleted
		),
		-- Every decoupled ancestor is a source: grouping deduplicates DAG
		-- multi-paths meeting at the same ancestor, min(depth) keeps the
		-- nearest-first ordering stable.
		decoupled_ancestors AS (
			SELECT a.root, a.guid, min(a.depth) AS depth
			FROM ancestry a
			WHERE a.depth > 0 AND a.decoupled
			GROUP BY a.root, a.guid
		),
		-- The organizational units above a container's unit, walked once per
		-- distinct unit: those with a matrix of their own govern the contents
		-- of the units below them.
		unit_chain(unit, guid, depth, path, is_cycle) AS (
			SELECT u.unit, u.unit, 0, ARRAY[u.unit], false
			FROM (
				SELECT DISTINCT b.organizational_unit AS unit
				FROM base b
				WHERE b.organizational_unit IS NOT NULL
			) u
			UNION ALL
			SELECT uc.unit, parent.object, uc.depth + 1, array_append(uc.path, parent.object),
				parent.object = ANY(uc.path)
			FROM unit_chain uc
			CROSS JOIN LATERAL unnest(ARRAY(
				SELECT cr.object
				FROM container_relation cr
				WHERE cr.subject = uc.guid
					AND cr.predicate = ${predicates.enum['is-part-of']}
					AND cr.valid_currently
					AND NOT cr.deleted
			)) AS parent(object)
			WHERE NOT uc.is_cycle
		),
		decoupled_units AS (
			SELECT uc.unit, uc.guid, min(uc.depth) AS depth
			FROM unit_chain uc
			JOIN container c ON c.guid = uc.guid AND c.valid_currently AND NOT c.deleted AND c.own_matrix
			GROUP BY uc.unit, uc.guid
		),
		-- A chain counts as open when it tops out (or cycles) without having
		-- passed a decoupled ancestor — the root itself may be decoupled; such
		-- chains bring the area in, once per root. The LATERAL probe keeps this
		-- on per-row index lookups.
		open_chain AS (
			SELECT DISTINCT a.root
			FROM ancestry a
			CROSS JOIN LATERAL (
				SELECT NOT EXISTS (
					SELECT 1
					FROM container_relation cr
					WHERE cr.subject = a.guid
						AND cr.predicate = ANY(${sql.array(hierarchyPredicates, 'text')})
						AND cr.valid_currently
						AND NOT cr.deleted
				) AS no_parents
			) t
			WHERE NOT a.shielded AND (a.depth = 0 OR NOT a.decoupled)
				AND (t.no_parents OR a.is_cycle)
		),
		-- The area an open chain brings in: the units above with a matrix of
		-- their own, nearest first, else the organization. It governs an
		-- inheriting container and lies dormant beside a decoupled one.
		area AS (
			SELECT b.root, b.decoupled, du.guid, ${unitSourceOrd}::int + du.depth AS ord
			FROM base b
			JOIN open_chain oc ON oc.root = b.root
			JOIN decoupled_units du ON du.unit = b.organizational_unit
			UNION ALL
			SELECT b.root, b.decoupled, b.organization, 2147483647
			FROM base b
			JOIN open_chain oc ON oc.root = b.root
			WHERE NOT EXISTS (
				SELECT 1 FROM decoupled_units du WHERE du.unit = b.organizational_unit
			)
		),
		-- A decoupled container is its own primary source (ord -1); the
		-- decoupled ancestors of every chain apply side by side, nearest first,
		-- and only an inheriting container with an open chain falls back to the
		-- area, ordered last. A decoupled ancestor thus replaces the area
		-- matrices for the contents it governs.
		sources AS (
			SELECT b.root, b.root AS source, -1 AS ord FROM base b WHERE b.decoupled
			UNION ALL
			SELECT da.root, da.guid, da.depth FROM decoupled_ancestors da
			UNION ALL
			SELECT ar.root, ar.guid, ar.ord FROM area ar WHERE NOT ar.decoupled
		)
		-- no join back onto base: the planner grossly underestimates the CTE rows
		-- and nests such a join into a loop over materialized rows, which is
		-- quadratic in the number of containers (tens of seconds for a few
		-- thousand); every place row already carries all that is needed
		SELECT m.root AS guid, m.place, m.object, m.ord, g.kind, g.target
		FROM (
			SELECT s.root, 'source' AS place, s.source AS object, s.ord FROM sources s
			UNION ALL
			SELECT ar.root, 'dormant', ar.guid, ar.ord FROM area ar WHERE ar.decoupled
			UNION ALL
			SELECT b.root, 'organization', b.organization, NULL FROM base b
			UNION ALL
			SELECT b.root, 'organizational_unit', uc.guid, NULL
			FROM base b
			JOIN unit_chain uc ON uc.unit = b.organizational_unit
		) m
		LEFT JOIN container_grant g ON g.object = m.object
			AND g.subject IN (SELECT s.subject FROM subjects s)
	`);

	const result = new Map<string, UserGrants>();

	// Grouping once keeps this linear; filtering the rows per container is
	// quadratic in the number of containers (seconds for a few thousand).
	for (const [guid, forGuid] of Map.groupBy(rows, (r) => r.guid)) {
		const kindsAt = (place: string, target: string, object?: string) =>
			forGuid
				.filter(
					(r) =>
						r.place === place &&
						r.target === target &&
						r.kind !== null &&
						(object === undefined || r.object === object)
				)
				.map((r) => r.kind as GrantKind);

		// the sources in nearest-first order; a guid reachable both through a
		// chain and as the scope fallback keeps its lowest rank
		const rankByObject = new Map<string, number>();
		for (const r of forGuid) {
			if (r.place !== 'source') continue;
			const ord = r.ord ?? 0;
			const previous = rankByObject.get(r.object);
			if (previous === undefined || ord < previous) {
				rankByObject.set(r.object, ord);
			}
		}
		const ordered = [...rankByObject.entries()]
			.sort(([a, ordA], [b, ordB]) => ordA - ordB || a.localeCompare(b))
			.map(([object]) => object);

		// governed by nothing beyond the area (the units and the organization
		// rank last); a decoupled container names itself as the source, which
		// reads as false here
		const scopeSourced = ordered.every(
			(source) => (rankByObject.get(source) ?? 0) >= unitSourceOrd
		);

		// the nearest area a decoupled container would fall back to
		const dormant = forGuid
			.filter((r) => r.place === 'dormant')
			.sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))[0]?.object;

		result.set(
			guid,
			composeUserGrants({
				dormant,
				scopeSourced,
				governsItself: ordered[0] === guid,
				organizationSelf: kindsAt('organization', 'self'),
				organizationalUnitSelf: kindsAt('organizational_unit', 'self'),
				sources: ordered.map((object) => ({
					guid: object,
					self: kindsAt('source', 'self', object),
					subordinates: kindsAt('source', 'subordinates', object)
				}))
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
 * organization scopes, additively — the pre-matrix behavior. Stored grant rows lie dormant.
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
		-- The LATERAL probe keeps the team check on per-row index lookups. Written
		-- as a plain join with EXISTS, the planner flattens it into a semi join that
		-- scans every container and container_user row once the ancestry grows
		-- beyond a few hundred rows (seconds for a few thousand containers).
		teamed AS (
			SELECT DISTINCT ON (a.root) a.root, a.guid
			FROM ancestry a
			JOIN LATERAL (
				SELECT 1
				FROM container c
				WHERE c.guid = a.guid AND c.valid_currently AND NOT c.deleted
					AND EXISTS (
						SELECT 1 FROM container_user cu
						WHERE cu.object = c.revision AND cu.predicate = ANY(${sql.array(rolePredicates, 'text')})
					)
				LIMIT 1
			) t ON true
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
	const rowsByGuid = Map.groupBy(rows, (r) => r.guid);

	for (const guid of guids) {
		const forGuid = rowsByGuid.get(guid) ?? [];
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
		// the surrounding organization scopes apply side by side
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
			// the pre-matrix rules let organization-wide roles move content between
			// units regardless of a team of its own, so roles on the surrounding
			// scopes count as scope-sourced
			scope_sourced:
				[organizationSet, unitSet].some((set) => set.self.length + set.subordinates.length > 0) ||
				team === undefined,
			member: team
				? teamSet.subordinates.includes(grantKinds.enum.read)
				: subordinates.includes(grantKinds.enum.read),
			organization_manager: organizationSet.self.includes(grantKinds.enum['manage-users']),
			own: governsItself ? teamSet.self : [],
			self: subordinates.filter((kind) => kind !== grantKinds.enum.create),
			source: team?.object ?? forGuid[0]?.object ?? guid,
			sources: [team?.object ?? forGuid[0]?.object ?? guid],
			subordinates
		});
	}

	return result;
}

type UserGrantsComparable = {
	guid: string;
	user_grant?: UserGrants;
};

/**
 * Attaches the effective grants of the given subject to the containers as
 * `grant`, computed at read time and never stored. The property is
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
			container.user_grant = value;
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
