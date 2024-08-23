ALTER TABLE "user" RENAME COLUMN guid TO subject;
ALTER TABLE container_user RENAME COLUMN object TO revision;
ALTER TABLE container_user RENAME CONSTRAINT container_user_object_fkey TO container_user_revision_fkey;
