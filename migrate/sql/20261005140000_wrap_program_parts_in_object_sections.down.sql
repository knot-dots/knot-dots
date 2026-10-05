-- Removes every object section at a program together with its relations and
-- creator rows, and turns text sections of programs back into program parts.
-- Object sections created after the migration cannot be told apart and are
-- removed as well.
BEGIN;

CREATE TEMPORARY TABLE program_object_sections ON COMMIT DROP AS
SELECT s.guid, s.revision
FROM container s
JOIN container_relation r ON r.subject = s.guid AND r.predicate = 'is-section-of'
JOIN container p ON p.guid = r.object AND p.payload->>'type' = 'program'
WHERE s.payload->>'type' = 'object_collection';

DELETE FROM container_user cu
USING program_object_sections s
WHERE cu.object = s.revision;

DELETE FROM container_relation r
USING program_object_sections s
WHERE r.subject = s.guid OR r.object = s.guid;

DELETE FROM container c
USING program_object_sections s
WHERE c.guid = s.guid;

UPDATE container_relation r
SET predicate = 'is-part-of-program'
FROM container t, container p
WHERE r.subject = t.guid
  AND r.object = p.guid
  AND r.predicate = 'is-section-of'
  AND t.payload->>'type' = 'text'
  AND t.valid_currently
  AND p.payload->>'type' = 'program'
  AND p.valid_currently;

COMMIT;
