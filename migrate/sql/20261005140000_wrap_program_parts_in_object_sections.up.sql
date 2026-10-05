-- Programs now show their parts through sections instead of a flat chapter
-- list. Every goal, measure, simple measure, rule and knowledge object that is
-- part of a program gets its own object section holding exactly that object,
-- placed at the part's position; text parts become text sections directly.
-- The is-part-of-program relations stay untouched. Positions are renumbered
-- per program in the previous display order (position, then guid), because the
-- stored positions are neither unique nor contiguous.
BEGIN;

CREATE TEMPORARY TABLE program_part_sections ON COMMIT DROP AS
SELECT r.object AS program,
       r.subject AS part,
       c.revision AS part_revision,
       gen_random_uuid() AS section,
       row_number() OVER (PARTITION BY r.object ORDER BY r.position, r.subject) - 1 AS position,
       c.payload->>'type' AS object_type,
       COALESCE(c.payload->>'visibility', 'organization') AS visibility,
       p.realm,
       p.organization,
       p.organizational_unit,
       p.managed_by
FROM container_relation r
JOIN container p ON p.guid = r.object AND p.valid_currently AND NOT p.deleted
JOIN container c ON c.guid = r.subject AND c.valid_currently AND NOT c.deleted
WHERE r.predicate = 'is-part-of-program'
  AND r.valid_currently
  AND NOT r.deleted
  AND p.payload->>'type' = 'program'
  AND c.payload->>'type' IN ('goal', 'knowledge', 'measure', 'rule', 'simple_measure', 'text');

-- Sections a program already had stay behind the parts, as they were displayed before.
UPDATE container_relation r
SET position = r.position + counts.parts
FROM (SELECT program, count(*) AS parts FROM program_part_sections GROUP BY program) counts
WHERE r.object = counts.program
  AND r.predicate = 'is-section-of'
  AND r.valid_currently
  AND NOT r.deleted;

INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT section,
       jsonb_build_object(
           'item', jsonb_build_array(part),
           'listType', 'list',
           'objectType', object_type,
           'title', '',
           'type', 'object_collection',
           'visibility', visibility
       ),
       realm,
       organization,
       organizational_unit,
       managed_by
FROM program_part_sections
WHERE object_type <> 'text';

INSERT INTO container_relation (object, position, predicate, subject)
SELECT program, position, 'is-section-of', section
FROM program_part_sections
WHERE object_type <> 'text';

-- A section is readable by the same people as its object: copy the creator rows,
-- which govern the visibility "creator".
INSERT INTO container_user (object, predicate, subject)
SELECT s.revision, cu.predicate, cu.subject
FROM program_part_sections pps
JOIN container s ON s.guid = pps.section AND s.valid_currently
JOIN container_user cu ON cu.object = pps.part_revision AND cu.predicate = 'is-creator-of'
WHERE pps.object_type <> 'text'
ON CONFLICT DO NOTHING;

UPDATE container_relation r
SET predicate = 'is-section-of', position = pps.position
FROM program_part_sections pps
WHERE r.object = pps.program
  AND r.subject = pps.part
  AND r.predicate = 'is-part-of-program'
  AND r.valid_currently
  AND NOT r.deleted
  AND pps.object_type = 'text';

COMMIT;
