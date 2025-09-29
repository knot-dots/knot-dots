ALTER TABLE container_user DROP CONSTRAINT container_user_predicate_object_subject_key;
ALTER TABLE container_user ADD CONSTRAINT container_user_subject_predicate_object_key UNIQUE (subject, predicate, object);
