ALTER TABLE container_user DROP COLUMN predicate;
ALTER TABLE container_user ADD COLUMN issuer varchar(1024);
DROP TABLE "user";
