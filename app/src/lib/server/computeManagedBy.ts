import { Roarr as log } from 'roarr';
import { type DatabaseConnection, sql } from 'slonik';
import { z } from 'zod';
import { createFeatureDecisions } from '$lib/features';
import { predicates } from '$lib/models';
import { getFeatures } from '$lib/server/features';

// Structural relations along which managed_by is inherited from a container towards
// its ancestors (child.subject -> parent.object).
const hierarchyPredicates = [
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-section-of']
];

// Membership relations that make a container a team of its own.
const rolePredicates = [
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of'],
	predicates.enum['is-member-of']
];

/**
 * Computes the `computed_managed_by` values for the given containers: all teams
 * along the hierarchy, derived at read time from the is-part-of chains and team
 * memberships. For each container the result contains
 *   - the container's own guid, if it has a team (a direct role membership), and
 *   - the guid of every ancestor that has a team,
 * ordered nearest-first (the container's own team before its program's team). A
 * measure within a teamed program is thus editable by both teams; under a
 * teamless program (or none at all) only by its own team. Only when no team
 * exists anywhere in the chain does the result fall back to the single value
 * `organizational_unit ?? organization` — an organization or organizational
 * unit is never assigned in addition to a team.
 */
export async function computeManagedBy(
	connection: DatabaseConnection,
	guids: string[]
): Promise<Map<string, string[]>> {
	if (guids.length === 0) {
		return new Map();
	}

	// The correlated ARRAY subselects cannot be flattened by the planner, which
	// forces cheap per-row index probes (container_relation_subject_predicate_idx,
	// container_user_object_idx) instead of hashing or sorting entire tables. The
	// planner still grossly overestimates the row counts of the recursive CTE; the
	// resulting phantom cost would trigger JIT compilation worth several hundred
	// milliseconds, which is why the pool disables JIT (see getPool in db.ts).
	const rows = await connection.any(sql.type(
		z.object({ guid: z.string().uuid(), computed_managed_by: z.array(z.string().uuid()) })
	)`
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
			SELECT a.root, a.guid, a.depth
			FROM ancestry a
			JOIN LATERAL (
				SELECT 1
				FROM container c
				WHERE c.guid = a.guid AND c.valid_currently AND NOT c.deleted
					AND EXISTS (
						SELECT 1
						FROM container_user cu
						WHERE cu.object = c.revision
							AND cu.predicate = ANY(${sql.array(rolePredicates, 'text')})
					)
				LIMIT 1
			) t ON true
		),
		teams AS (
			-- min(depth) deduplicates DAG multi-paths (e.g. two programs sharing an
			-- ancestor); depth ASC orders nearest-first, so that [0] remains the
			-- effective manager in today's single-value sense — the write sites
			-- materialize managed_by[0] back into the stored column. The guid is a
			-- deterministic tie-break for teamed ancestors at the same depth.
			SELECT root, array_agg(guid ORDER BY depth ASC, guid ASC) AS managed_by
			FROM (SELECT root, guid, min(depth) AS depth FROM teamed GROUP BY root, guid) t
			GROUP BY root
		),
		roots AS (
			SELECT DISTINCT g::uuid AS root FROM unnest(${sql.array(guids, 'uuid')}) AS g
		)
		SELECT
			roots.root AS guid,
			coalesce(t.managed_by, ARRAY[coalesce(c.organizational_unit, c.organization)]) AS computed_managed_by
		FROM roots
		JOIN container c ON c.guid = roots.root AND c.valid_currently AND NOT c.deleted
		LEFT JOIN teams t ON t.root = roots.root
	`);

	return new Map(rows.map((r) => [r.guid, r.computed_managed_by]));
}

type ManagedByComparable = {
	guid: string;
	managed_by: string[];
	organization: string;
	organizational_unit: string | null;
	payload: { type: string };
	computed_managed_by?: string[];
};

/**
 * Behind the `ComputedManagedBy` feature flag, computes the managed_by value for the
 * given containers at read time, surfaces it as `computed_managed_by` and replaces
 * `managed_by` with it, so that authorization and clients work with the derived value
 * instead of the stored column. A discrepancy with the stored column is logged before
 * the replacement. When the flag is off it is a no-op, so there is no added cost on
 * the read path.
 *
 * The replacement deliberately reaches write flows: a container loaded and written
 * back materializes the computed value into the stored column, incrementally
 * repairing stale values while the flag is being trialled.
 */
export async function applyComputedManagedBy<T extends ManagedByComparable>(
	connection: DatabaseConnection,
	containers: T[]
): Promise<T[]> {
	if (containers.length === 0 || !createFeatureDecisions(getFeatures()).useComputedManagedBy()) {
		return containers;
	}

	const computed = await computeManagedBy(
		connection,
		containers.map((c) => c.guid)
	);

	for (const container of containers) {
		const value = computed.get(container.guid);
		if (value === undefined) {
			continue;
		}
		// The stored column is expected to carry the effective (nearest) manager,
		// which the accumulated array orders first.
		if (container.managed_by[0] !== value[0]) {
			log.warn(
				{
					guid: container.guid,
					type: container.payload.type,
					organization: container.organization,
					organizational_unit: container.organizational_unit,
					managed_by: container.managed_by,
					computed_managed_by: value
				},
				'[managed_by] stored/computed discrepancy'
			);
		}
		container.computed_managed_by = value;
		container.managed_by = value;
	}

	return containers;
}
