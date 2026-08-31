-- The seeded grant chains understate what the authorization rules actually
-- permit: collaborators may delete content managed by their containers and
-- heads may invite members. Align the granted kinds with those effective
-- rules before the rules start interpreting the kinds directly, so that the
-- switch does not take rights away from anyone.
BEGIN;

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
	WHEN is_admin THEN ARRAY[]::varchar[]
	WHEN is_head THEN ARRAY['manage-members']
	WHEN is_collaborator THEN ARRAY['delete']
	ELSE ARRAY[]::varchar[]
END)
FROM role_relations
ON CONFLICT (object, subject, kind) DO NOTHING;

COMMIT;
