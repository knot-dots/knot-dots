-- Removes exactly the kinds the up migration added, based on the current role
-- relations. Free-form grant edits made in the meantime cannot be
-- reconstructed.
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
DELETE FROM container_grant cg
USING role_relations rr
WHERE cg.object = rr.object AND cg.subject = rr.subject
	AND NOT rr.is_admin
	AND ((rr.is_head AND cg.kind = 'manage-members')
		OR (rr.is_collaborator AND NOT rr.is_head AND cg.kind = 'delete'));

COMMIT;
