DELETE FROM task_priority;
ALTER TABLE task_priority DROP COLUMN task;
ALTER TABLE task_priority ADD COLUMN task uuid;
ALTER TABLE task_priority ADD CONSTRAINT task_priority_key UNIQUE (priority, task);
