import { sql, type DatabaseConnection } from 'slonik';
import { z } from 'zod';
import { payloadTypes, predicates } from '@knot-dots/app/src/lib/models.ts';

// Predicates along which managed_by is inherited from a container towards its
// ancestors (and, in reverse, towards its descendants for cascade re-indexing).
const hierarchyPredicates = [
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-section-of']
];

// Role assignments that make a program/measure a team of its own.
const rolePredicates = [
	predicates.enum['is-admin-of'],
	predicates.enum['is-collaborator-of'],
	predicates.enum['is-head-of'],
	predicates.enum['is-member-of']
];

/**
 * Computes the multi-valued, virtual `managed_by` for the given containers.
 *
 * `managed_by` is no longer stored. For each container it is the set of guids of
 * that container and its ancestors along the `is-part-of` / `is-part-of-measure`
 * / `is-part-of-program` / `is-section-of` chain that are programs/measures with
 * their own team (i.e. have at least one direct role assignment). Organizations
 * and organizational units are never included; their access is handled by the
 * organization / organizational_unit authorization rules.
 *
 * Lives here rather than in `@knot-dots/shared` so the indexing worker and the
 * bulk indexer (which already depend on `@knot-dots/app`) can share it without
 * the app gaining a new package dependency.
 */
export async function computeManagedBy(
	connection: DatabaseConnection,
	guids: string[]
): Promise<Map<string, string[]>> {
	if (guids.length === 0) {
		return new Map();
	}

	const rows = await connection.any(sql.type(
		z.object({ guid: z.string().uuid(), managed_by: z.array(z.string().uuid()) })
	)`
		WITH RECURSIVE ancestor(root, guid) AS (
			SELECT g::uuid, g::uuid
			FROM unnest(${sql.array(guids, 'uuid')}) AS g
			UNION
			SELECT a.root, cr.object
			FROM ancestor a
			JOIN container_relation cr ON cr.subject = a.guid
				AND cr.predicate = ANY(${sql.array(hierarchyPredicates, 'text')})
				AND cr.valid_currently
				AND NOT cr.deleted
		)
		SELECT a.root AS guid,
			coalesce(
				array_agg(DISTINCT p.guid) FILTER (
					WHERE p.payload->>'type' = ANY(${sql.array(
						[
							payloadTypes.enum.program,
							payloadTypes.enum.measure,
							payloadTypes.enum.simple_measure
						],
						'text'
					)})
					AND EXISTS (
						SELECT 1
						FROM container_user cu
						WHERE cu.object = p.revision
							AND cu.predicate = ANY(${sql.array(rolePredicates, 'text')})
					)
				),
				'{}'
			) AS managed_by
		FROM ancestor a
		JOIN container p ON p.guid = a.guid AND p.valid_currently AND NOT p.deleted
		GROUP BY a.root
	`);

	return new Map(rows.map((r) => [r.guid, [...r.managed_by]]));
}

/**
 * Returns the guids of the given containers together with all their descendants
 * along the managed_by hierarchy. Used to cascade re-indexing when a container's
 * team or its position in the hierarchy changes: the container's own managed_by
 * changes, and so does that of everything below it.
 */
export async function getManagedByDescendants(
	connection: DatabaseConnection,
	guids: string[]
): Promise<string[]> {
	if (guids.length === 0) {
		return [];
	}

	const rows = await connection.any(sql.type(z.object({ guid: z.string().uuid() }))`
		WITH RECURSIVE descendant(guid) AS (
			SELECT g::uuid
			FROM unnest(${sql.array(guids, 'uuid')}) AS g
			UNION
			SELECT cr.subject
			FROM descendant d
			JOIN container_relation cr ON cr.object = d.guid
				AND cr.predicate = ANY(${sql.array(hierarchyPredicates, 'text')})
				AND cr.valid_currently
				AND NOT cr.deleted
		)
		SELECT guid FROM descendant
	`);

	return rows.map((r) => r.guid);
}
