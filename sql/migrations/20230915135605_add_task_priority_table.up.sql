CREATE TABLE task_priority (
    priority int,
    task bigint REFERENCES container (revision) ON DELETE CASCADE
);
