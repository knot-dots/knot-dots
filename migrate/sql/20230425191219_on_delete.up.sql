ALTER TABLE container_user DROP CONSTRAINT container_user_revision_fkey;
ALTER TABLE container_user ADD FOREIGN KEY (revision) REFERENCES container (revision) ON DELETE CASCADE;
