-- container_grant stores the granted capability of a subject on a container as
-- fine-grained kinds, derived from the member role (observer may read,
-- collaborators may also update and create, heads may additionally delete, and
-- admins get every kind including manage-members). The rows mirror the role
-- relations and are kept in sync by the container write paths; they express
-- what was GRANTED, not what is currently effective — the effective rights per
-- container type stay derived from the authorization rules until those rules
-- interpret the kinds directly. object is a container guid (guid is not unique
-- across revisions, so no foreign key) and subject is not constrained to users
-- so it can later hold team or public pseudo subjects.
BEGIN;

CREATE TABLE container_grant (
	object uuid NOT NULL,
	subject uuid NOT NULL,
	kind varchar(32) NOT NULL
		CHECK (kind IN ('read', 'update', 'create', 'delete', 'manage-members')),
	UNIQUE (object, subject, kind)
);

CREATE INDEX container_grant_subject_idx ON container_grant (subject);

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
