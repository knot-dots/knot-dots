CREATE TABLE container_relation (
    predicate varchar(128),
    object integer REFERENCES container (revision) ON DELETE CASCADE,
    subject integer REFERENCES container (revision) ON DELETE CASCADE,
    UNIQUE (predicate, object, subject)
);

CREATE INDEX container_relation_predicate_idx ON container_relation (predicate);
