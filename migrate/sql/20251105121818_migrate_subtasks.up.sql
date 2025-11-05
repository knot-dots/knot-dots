BEGIN;

UPDATE container_relation cr
SET predicate = 'is-part-of'
WHERE predicate = 'is-subtask-of';

COMMIT;
