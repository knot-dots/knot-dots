BEGIN;

CREATE INDEX container_relation_subject_predicate_idx ON container_relation (subject, predicate)
WHERE valid_currently
    AND NOT deleted;

COMMIT;
