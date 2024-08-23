DELETE FROM container_user WHERE predicate != 'is-creator-of';
ALTER TABLE container_user ADD CONSTRAINT container_user_predicate_object_subject_key UNIQUE (predicate, object, subject);
ALTER TABLE container_user ADD CONSTRAINT container_user_subject_fkey FOREIGN KEY (subject) REFERENCES "user" (guid);
