-- Grants distinguish what a subject may do with the container itself (target
-- 'self': read, update, manage-users) from what it may do with subordinate
-- objects within it (target 'subordinates': read, update, create, delete,
-- manage-users). The rows are rebuilt from the current member roles with the
-- new mapping: observers read on both targets; collaborators additionally
-- update the object and work on subordinate objects except managing their
-- users; heads get every subordinate kind but deliberately not manage-users
-- on the object itself — a subject holding every kind on both targets counts
-- as an administrator.
BEGIN;

DELETE FROM container_grant;

ALTER TABLE container_grant DROP CONSTRAINT container_grant_object_subject_kind_key;
ALTER TABLE container_grant DROP CONSTRAINT container_grant_kind_check;

ALTER TABLE container_grant ADD COLUMN target varchar(32) NOT NULL DEFAULT 'self';
ALTER TABLE container_grant ALTER COLUMN target DROP DEFAULT;

ALTER TABLE container_grant ADD CONSTRAINT container_grant_kind_target_check CHECK (
	(target = 'self' AND kind IN ('read', 'update', 'manage-users'))
	OR (target = 'subordinates' AND kind IN ('read', 'update', 'create', 'delete', 'manage-users'))
);

ALTER TABLE container_grant
	ADD CONSTRAINT container_grant_object_subject_kind_target_key UNIQUE (object, subject, kind, target);

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
INSERT INTO container_grant (object, subject, kind, target)
SELECT object, subject, g.kind, g.target
FROM role_relations
CROSS JOIN LATERAL (
	SELECT unnest(CASE
		WHEN is_admin THEN ARRAY['read', 'update', 'manage-users']
		WHEN is_head OR is_collaborator THEN ARRAY['read', 'update']
		ELSE ARRAY['read']
	END) AS kind, 'self' AS target
	UNION ALL
	SELECT unnest(CASE
		WHEN is_admin OR is_head THEN ARRAY['read', 'update', 'create', 'delete', 'manage-users']
		WHEN is_collaborator THEN ARRAY['read', 'update', 'create', 'delete']
		ELSE ARRAY['read']
	END), 'subordinates'
) AS g;

COMMIT;
