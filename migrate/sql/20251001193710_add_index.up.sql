CREATE INDEX idx_container_relation_subject_predicate_idx ON container_relation (subject, predicate, valid_currently, deleted) WHERE valid_currently = true AND deleted = false;
