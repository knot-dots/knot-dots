BEGIN;

-- Goal, task and measure collections of goals and measures become relation
-- sections that list the objects they used to derive from relations.
-- Collections of organizations, organizational units, reports and tasks keep
-- their type.
CREATE TEMPORARY TABLE legacy_section ON COMMIT DROP AS
SELECT s.guid AS section,
       s.payload->>'type' AS legacy_type,
       p.guid AS parent,
       CASE s.payload->>'type'
           WHEN 'goal_collection' THEN 'goal'
           WHEN 'task_collection' THEN 'task'
           WHEN 'measure_collection' THEN 'measure'
       END AS payload_type
FROM container s
JOIN container_relation r
    ON r.subject = s.guid
   AND r.predicate = 'is-section-of'
   AND r.valid_currently
   AND NOT r.deleted
JOIN container p
    ON p.guid = r.object
   AND p.valid_currently
   AND NOT p.deleted
WHERE s.valid_currently
  AND NOT s.deleted
  AND (
      (s.payload->>'type' IN ('goal_collection', 'task_collection')
          AND p.payload->>'type' IN ('goal', 'measure', 'simple_measure'))
      OR (s.payload->>'type' = 'measure_collection' AND p.payload->>'type' = 'measure')
  );

-- Items follow what the collections displayed: goals related to the parent by
-- is-part-of or is-part-of-measure, tasks and measures by is-part-of.
CREATE TEMPORARY TABLE legacy_section_item ON COMMIT DROP AS
SELECT section, jsonb_agg(to_jsonb(guid) ORDER BY position, guid) AS item
FROM (
    SELECT ls.section, c.guid, min(r.position) AS position
    FROM legacy_section ls
    JOIN container_relation r
        ON r.object = ls.parent
       AND r.valid_currently
       AND NOT r.deleted
       AND (
           (ls.legacy_type = 'goal_collection'
               AND r.predicate IN ('is-part-of', 'is-part-of-measure'))
           OR (ls.legacy_type IN ('task_collection', 'measure_collection')
               AND r.predicate = 'is-part-of')
       )
    JOIN container c
        ON c.guid = r.subject
       AND c.valid_currently
       AND NOT c.deleted
       AND (
           (ls.legacy_type = 'goal_collection' AND c.payload->>'type' = 'goal')
           OR (ls.legacy_type = 'task_collection' AND c.payload->>'type' = 'task')
           OR (ls.legacy_type = 'measure_collection'
               AND c.payload->>'type' IN ('measure', 'simple_measure'))
       )
    GROUP BY ls.section, c.guid
) AS children
GROUP BY section;

-- Convert all revisions of a section so its history keeps parsing.
UPDATE container c
SET payload = c.payload || jsonb_build_object(
    'item', coalesce(i.item, '[]'::jsonb),
    'listType', 'carousel',
    'payloadType', ls.payload_type,
    'predicate', 'is-part-of',
    'type', 'relation_collection'
)
FROM legacy_section ls
LEFT JOIN legacy_section_item i ON i.section = ls.section
WHERE c.guid = ls.section;

COMMIT;
