CREATE TABLE "user" (
    display_name varchar(64) DEFAULT '',
    subject uuid PRIMARY KEY,
    realm varchar(1024)
);

CREATE INDEX user_display_name_idx ON "user" (display_name);
CREATE INDEX user_realm_idx ON "user" (realm);

INSERT INTO "user" (realm, subject)
SELECT DISTINCT realm, subject FROM container c JOIN container_user cu ON c.revision = cu.revision;

ALTER TABLE container_user DROP COLUMN issuer;
ALTER TABLE container_user ADD COLUMN predicate varchar(128) DEFAULT 'is-creator-of';
