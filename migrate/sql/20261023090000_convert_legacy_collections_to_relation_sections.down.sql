BEGIN;

-- Relation sections for goals, tasks and measures of goals and measures become
-- the legacy collections again, which derive their items from relations.
-- Sections created after the migration cannot be told apart and are converted
-- as well.
UPDATE container c
SET payload = (c.payload - 'item' - 'listType' - 'payloadType' - 'predicate')
    || jsonb_build_object(
        'type',
        CASE c.payload->>'payloadType'
            WHEN 'goal' THEN 'goal_collection'
            WHEN 'task' THEN 'task_collection'
            WHEN 'measure' THEN 'measure_collection'
        END
    )
WHERE c.payload->>'type' = 'relation_collection'
  AND c.payload->>'predicate' = 'is-part-of'
  AND c.payload->>'payloadType' IN ('goal', 'task', 'measure')
  AND EXISTS (
      SELECT 1
      FROM container_relation r
      JOIN container p
          ON p.guid = r.object
         AND p.valid_currently
         AND NOT p.deleted
      WHERE r.subject = c.guid
        AND r.predicate = 'is-section-of'
        AND r.valid_currently
        AND NOT r.deleted
        AND (
            (c.payload->>'payloadType' IN ('goal', 'task')
                AND p.payload->>'type' IN ('goal', 'measure', 'simple_measure'))
            OR (c.payload->>'payloadType' = 'measure' AND p.payload->>'type' = 'measure')
        )
  );

COMMIT;
