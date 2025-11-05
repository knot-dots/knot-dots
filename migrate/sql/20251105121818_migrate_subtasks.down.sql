BEGIN;

WITH subtasks AS (
    SELECT *
    FROM container_relation cr
    JOIN container c ON cr.object = c.guid AND c.payload->>'type' = 'task'
)
UPDATE container_relation cr
SET predicate = 'is-subtask-of'
FROM subtasks s
WHERE s.predicate = 'is-part-of'
  AND cr.subject = s.subject
  AND cr.object = s.object;

COMMIT;
