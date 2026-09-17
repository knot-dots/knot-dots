import { type DatabaseConnection, sql } from 'slonik';
import { z } from 'zod';
import { type GrantKind, grantKinds, predicates, type UserGrants } from '$lib/models';

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

const fullSelfSet: GrantKind[] = [
	grantKinds.enum.read,
	grantKinds.enum.update,
	grantKinds.enum['manage-users']
];

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

	const canonical = (kinds: Iterable<GrantKind>) =>
		grantKinds.options.filter((kind) => new Set(kinds).has(kind));

	for (const guid of new Set(rows.map((r) => r.guid))) {
		const forGuid = rows.filter((r) => r.guid === guid);
		const { source, area_sourced } = forGuid[0];
		const kindsAt = (place: string, target: string) =>
			forGuid
				.filter((r) => r.place === place && r.target === target && r.kind !== null)
				.map((r) => r.kind as GrantKind);

		const sourceSelfRows = canonical(kindsAt('source', 'self'));
		// Holders of every self kind at the source administer everything it
		// governs; administrators of an area keep that hold on its contents
		// regardless of decoupled matrices in between.
		const admin =
			fullSelfSet.every((kind) => sourceSelfRows.includes(kind)) ||
			['organization', 'organizational_unit'].some((place) =>
				fullSelfSet.every((kind) => kindsAt(place, 'self').includes(kind))
			);

		// The subordinate kinds of the source apply within the container and,
		// except for creating (which happens within a container, never on it),
		// to the container itself. The container's own self rows count only
		// while its own matrix governs.
		const subordinates = admin
			? grantKinds.options.slice()
			: canonical(kindsAt('source', 'subordinates'));
		const self = subordinates.filter((kind) => kind !== grantKinds.enum.create);
		const own = source === guid ? sourceSelfRows : [];

		// Read granted by something other than an area makes the subject a
		// member of the governing matrix — the mark members-only visibility
		// asks for.
		const member =
			!area_sourced &&
			(subordinates.includes(grantKinds.enum.read) || own.includes(grantKinds.enum.read));

		result.set(guid, { admin, member, own, self, source, subordinates });
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

	const computed = await computeUserGrants(
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
