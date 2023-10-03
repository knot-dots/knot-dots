DELETE FROM task_priority;
ALTER TABLE task_priority DROP COLUMN task;
ALTER TABLE task_priority ADD COLUMN task bigint REFERENCES container (revision) ON DELETE CASCADE;
