-- Removes the is-section-of relations that accompany is-part-of-program
-- relations between a program and its parts.
BEGIN;

DELETE FROM container_relation s
WHERE s.predicate = 'is-section-of'
  AND EXISTS (
		SELECT 1
		FROM container_relation cr
		JOIN container p ON p.guid = cr.object AND p.payload->>'type' = 'program'
		WHERE cr.predicate = 'is-part-of-program'
		  AND cr.object = s.object
		  AND cr.subject = s.subject
	);

COMMIT;
