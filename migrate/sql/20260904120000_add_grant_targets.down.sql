-- Restores the single-target grant table and rebuilds the rows from the
-- current member roles with the previous kind chain. Individual grant edits
-- made while the target column existed cannot be reconstructed.
BEGIN;

DELETE FROM container_grant;

ALTER TABLE container_grant DROP CONSTRAINT container_grant_kind_target_check;
ALTER TABLE container_grant DROP CONSTRAINT container_grant_object_subject_kind_target_key;
ALTER TABLE container_grant DROP COLUMN target;

ALTER TABLE container_grant ADD CONSTRAINT container_grant_kind_check
	CHECK (kind IN ('read', 'update', 'create', 'delete', 'manage-members'));

ALTER TABLE container_grant
	ADD CONSTRAINT container_grant_object_subject_kind_key UNIQUE (object, subject, kind);

WITH role_relations AS (
	SELECT c.guid AS object,
	       cu.subject,
	       bool_or(cu.predicate = 'is-admin-of') AS is_admin,
	       bool_or(cu.predicate = 'is-head-of') AS is_head,
	       bool_or(cu.predicate = 'is-collaborator-of') AS is_collaborator
	FROM container_user cu
	JOIN container c ON c.revision = cu.object AND c.valid_currently AND NOT c.deleted
	WHERE cu.predicate IN ('is-admin-of', 'is-head-of', 'is-collaborator-of', 'is-member-of')
	GROUP BY c.guid, cu.subject
)
INSERT INTO container_grant (object, subject, kind)
SELECT object, subject, unnest(CASE
	WHEN is_admin THEN ARRAY['read', 'update', 'create', 'delete', 'manage-members']
	WHEN is_head THEN ARRAY['read', 'update', 'create', 'delete']
	WHEN is_collaborator THEN ARRAY['read', 'update', 'create']
	ELSE ARRAY['read']
END)
FROM role_relations;

COMMIT;
