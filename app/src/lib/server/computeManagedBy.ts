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
	predicates.enum['is-part-of-measure']
];

// Membership relations that make a container a team of its own.
const rolePredicates = [
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of'],
	predicates.enum['is-member-of']
];

/**
 * Computes the `computed_managed_by` values for the given containers.
 *
 * This is the observational counterpart to the stored `managed_by` column: it
 * reproduces the value `managed_by` is supposed to have, derived at read time from
 * the hierarchy and team memberships. For each container it is
 *   1. the container's own guid, if it has a team (a direct role membership), else
 *   2. the guid of the nearest ancestor (along the is-part-of chain) that has a team, else
 *   3. its `organizational_unit ?? organization`.
 *
 * The result is an array by type, but currently carries exactly one value;
 * collecting multiple teams along the hierarchy is a later step.
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
		z.object({ guid: z.string().uuid(), computed_managed_by: z.string().uuid() })
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
		nearest AS (
			-- The guid is a deterministic tie-break for containers with several
			-- teamed ancestors at the same depth, e.g. a goal within both a goal
			-- and a program.
			SELECT DISTINCT ON (root) root, guid AS managed_by
			FROM teamed
			ORDER BY root, depth ASC, guid ASC
		),
		roots AS (
			SELECT DISTINCT g::uuid AS root FROM unnest(${sql.array(guids, 'uuid')}) AS g
		)
		SELECT
			roots.root AS guid,
			coalesce(n.managed_by, c.organizational_unit, c.organization) AS computed_managed_by
		FROM roots
		JOIN container c ON c.guid = roots.root AND c.valid_currently AND NOT c.deleted
		LEFT JOIN nearest n ON n.root = roots.root
	`);

	return new Map(rows.map((r) => [r.guid, [r.computed_managed_by]]));
}

type ManagedByComparable = {
	guid: string;
	managed_by: string;
	organization: string;
	organizational_unit: string | null;
	payload: { type: string };
	computed_managed_by?: string[];
};

/**
 * Behind the `ComputedManagedBy` feature flag, computes `computed_managed_by` for the
 * given containers, attaches it to each container (surfaced in the JSON representation)
 * and logs a discrepancy whenever it does not contain the stored `managed_by`. When the
 * flag is off it is a no-op, so there is no added cost on the read path.
 *
 * The stored `managed_by` continues to drive all behaviour; this is observation only.
 */
export async function attachComputedManagedBy<T extends ManagedByComparable>(
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
		container.computed_managed_by = value;
		if (!value.includes(container.managed_by)) {
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
	}

	return containers;
}
