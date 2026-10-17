-- The editable program detail view renders program parts with the generic
-- Sections component, which follows is-section-of. Parts keep their
-- is-part-of-program relation for the level board, grants, copying and
-- managed_by, and get a matching is-section-of relation at the same position.
BEGIN;

INSERT INTO container_relation (object, position, predicate, subject)
SELECT cr.object, cr.position, 'is-section-of', cr.subject
FROM container_relation cr
JOIN container p ON p.guid = cr.object
	AND p.valid_currently
	AND NOT p.deleted
	AND p.payload->>'type' = 'program'
JOIN container c ON c.guid = cr.subject
	AND c.valid_currently
	AND NOT c.deleted
WHERE cr.predicate = 'is-part-of-program'
  AND cr.valid_currently
  AND NOT cr.deleted
  AND NOT EXISTS (
		SELECT 1
		FROM container_relation s
		WHERE s.object = cr.object
		  AND s.subject = cr.subject
		  AND s.predicate = 'is-section-of'
		  AND s.valid_currently
		  AND NOT s.deleted
	);

COMMIT;
