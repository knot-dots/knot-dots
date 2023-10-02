ALTER TABLE "user" RENAME COLUMN subject TO guid;
ALTER TABLE container_user RENAME COLUMN revision TO object;
ALTER TABLE container_user RENAME CONSTRAINT container_user_revision_fkey TO container_user_object_fkey
