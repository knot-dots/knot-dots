-- Sections never followed their parent's managed_by: inviting a team into a
-- measure reassigns the measure (and its goals, tasks and effects) to itself,
-- but bulkUpdateManagedBy skipped section payload types, so existing sections
-- kept pointing at the organization or organizational unit and never offered
-- the team visibility option. Align every section with the value its creation
-- would produce today: the parent's managed_by, or the parent itself when the
-- parent is an organizational unit (see Sections.svelte). Nested sections
-- (e.g. teasers within column layouts) inherit through the chain.
BEGIN;

WITH RECURSIVE section_manager (guid, managed_by, path) AS (
	SELECT cr.subject,
	       CASE WHEN p.payload->>'type' = 'organizational_unit' THEN p.guid ELSE p.managed_by END,
	       ARRAY[cr.subject]
	FROM container_relation cr
	JOIN container p ON p.guid = cr.object AND p.valid_currently AND NOT p.deleted
	WHERE cr.predicate = 'is-section-of'
	  AND cr.valid_currently
	  AND NOT cr.deleted
	  AND NOT EXISTS (
			SELECT 1
			FROM container_relation up
			WHERE up.subject = p.guid
			  AND up.predicate = 'is-section-of'
			  AND up.valid_currently
			  AND NOT up.deleted
		)
	UNION ALL
	SELECT cr.subject, sm.managed_by, array_append(sm.path, cr.subject)
	FROM container_relation cr
	JOIN section_manager sm ON cr.object = sm.guid
	WHERE cr.predicate = 'is-section-of'
	  AND cr.valid_currently
	  AND NOT cr.deleted
	  AND cr.subject <> ALL (sm.path)
)
UPDATE container c
SET managed_by = sm.managed_by
FROM section_manager sm
WHERE c.guid = sm.guid
  AND c.valid_currently
  AND NOT c.deleted
  AND c.managed_by IS DISTINCT FROM sm.managed_by;

COMMIT;
