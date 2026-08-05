-- Prepare custom collection filters for the new organization scope semantics.
-- Organization values without an organizationalUnit key keep meaning "whole
-- organization" (resolved without an organizational unit constraint), so
-- collections that already carry explicit organization values need no change.
-- Item-based collections (e.g. municipality profiles) are left untouched, as
-- are filters already written in the new format ('current' sentinels; guarded
-- via CASE because WHERE conjuncts have no guaranteed evaluation order).
BEGIN;

-- 1. Collections with explicit organizational unit filters: drop the
--    organization values. Under the old semantics organization AND
--    organizational unit combined to organizational-unit-only results; under
--    the new semantics the organization values would add organization-level
--    content. Parent organizations are re-derived at query time.
UPDATE container
SET payload = jsonb_set(payload, '{filter,organization}', '[]'::jsonb)
WHERE payload->>'type' = 'custom_collection'
	AND jsonb_array_length(COALESCE(payload->'item', '[]'::jsonb)) = 0
	AND (CASE WHEN jsonb_typeof(payload->'filter'->'organizationalUnit') = 'array'
		THEN jsonb_array_length(payload->'filter'->'organizationalUnit') ELSE 0 END) > 0
	AND (CASE WHEN jsonb_typeof(payload->'filter'->'organization') = 'array'
		THEN jsonb_array_length(payload->'filter'->'organization') ELSE 0 END) > 0;

-- 2. Rule-based collections without any organization or organizational unit
--    filter fell back to the current organization at render time. Freeze that
--    to the container's own organization so the rule keeps its scope instead
--    of becoming relative to wherever it is rendered.
UPDATE container c
SET payload = jsonb_set(
	c.payload,
	'{filter}',
	COALESCE(c.payload->'filter', '{}'::jsonb)
		|| jsonb_build_object('organization', to_jsonb(ARRAY[c.organization::text])))
WHERE c.payload->>'type' = 'custom_collection'
	AND jsonb_array_length(COALESCE(c.payload->'item', '[]'::jsonb)) = 0
	AND (CASE
		WHEN c.payload->'filter'->'organization' IS NULL THEN true
		WHEN jsonb_typeof(c.payload->'filter'->'organization') = 'array'
			THEN jsonb_array_length(c.payload->'filter'->'organization') = 0
		ELSE false
	END)
	AND (CASE
		WHEN c.payload->'filter'->'organizationalUnit' IS NULL THEN true
		WHEN jsonb_typeof(c.payload->'filter'->'organizationalUnit') = 'null' THEN true
		WHEN jsonb_typeof(c.payload->'filter'->'organizationalUnit') = 'array'
			THEN jsonb_array_length(c.payload->'filter'->'organizationalUnit') = 0
		ELSE false
	END)
	AND EXISTS (
		SELECT 1
		FROM jsonb_each(COALESCE(c.payload->'filter', '{}'::jsonb)) f(key, value)
		WHERE f.key NOT IN ('organization', 'organizationalUnit', 'organizationalUnitWithChildren')
			AND jsonb_typeof(f.value) = 'array'
			AND jsonb_array_length(f.value) > 0
	);

COMMIT;
