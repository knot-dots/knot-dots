-- Prepare custom collection filters for the new organization scope semantics.
-- Filters written before the scope selector existed carry organization values
-- without an organizationalUnit key and meant "whole organization"; they are
-- normalized to organizationalUnitWithChildren so the old format no longer
-- occurs after this migration. Filters already written in the new format
-- ('current' sentinels) are left untouched; type checks are guarded via CASE
-- because WHERE conjuncts have no guaranteed evaluation order.
BEGIN;

-- 1. Rule-based collections with explicit organizational unit filters: drop
--    the organization values. Under the old semantics organization AND
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

-- 2. Old-format organization values (no organizationalUnit key) meant "whole
--    organization": move them to organizationalUnitWithChildren.
UPDATE container c
SET payload = jsonb_set(
	c.payload,
	'{filter}',
	COALESCE(c.payload->'filter', '{}'::jsonb) || jsonb_build_object(
		'organization', '[]'::jsonb,
		'organizationalUnit', '[]'::jsonb,
		'organizationalUnitWithChildren', c.payload->'filter'->'organization'))
WHERE c.payload->>'type' = 'custom_collection'
	AND (CASE WHEN jsonb_typeof(c.payload->'filter'->'organization') = 'array'
		THEN jsonb_array_length(c.payload->'filter'->'organization') ELSE 0 END) > 0
	AND c.payload->'filter'->'organizationalUnit' IS NULL
	AND c.payload->'filter'->'organizationalUnitWithChildren' IS NULL;

-- 3. Rule-based collections without any organization scope fell back to the
--    current organization at render time. Freeze that to the container's own
--    organization so the rule keeps its scope instead of becoming relative to
--    wherever it is rendered.
UPDATE container c
SET payload = jsonb_set(
	c.payload,
	'{filter}',
	COALESCE(c.payload->'filter', '{}'::jsonb) || jsonb_build_object(
		'organization', '[]'::jsonb,
		'organizationalUnit', '[]'::jsonb,
		'organizationalUnitWithChildren', to_jsonb(ARRAY[c.organization::text])))
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
		WHEN jsonb_typeof(c.payload->'filter'->'organizationalUnit') = 'array'
			THEN jsonb_array_length(c.payload->'filter'->'organizationalUnit') = 0
		ELSE false
	END)
	AND (CASE
		WHEN c.payload->'filter'->'organizationalUnitWithChildren' IS NULL THEN true
		WHEN jsonb_typeof(c.payload->'filter'->'organizationalUnitWithChildren') = 'array'
			THEN jsonb_array_length(c.payload->'filter'->'organizationalUnitWithChildren') = 0
		ELSE false
	END)
	AND EXISTS (
		SELECT 1
		FROM jsonb_each(COALESCE(c.payload->'filter', '{}'::jsonb)) f(key, value)
		WHERE f.key NOT IN ('organization', 'organizationalUnit', 'organizationalUnitWithChildren')
			AND jsonb_typeof(f.value) = 'array'
			AND jsonb_array_length(f.value) > 0
	);

-- 4. Collections without selected items but with filter values were rendered
--    as rules; persist that as the collection mode so the payload alone
--    determines how a section loads its content.
UPDATE container c
SET payload = jsonb_set(c.payload, '{mode}', '"apply_rule"'::jsonb)
WHERE c.payload->>'type' = 'custom_collection'
	AND jsonb_array_length(COALESCE(c.payload->'item', '[]'::jsonb)) = 0
	AND c.payload->>'mode' IS DISTINCT FROM 'apply_rule'
	AND EXISTS (
		SELECT 1
		FROM jsonb_each(COALESCE(c.payload->'filter', '{}'::jsonb)) f(key, value)
		WHERE jsonb_typeof(f.value) = 'array' AND jsonb_array_length(f.value) > 0
	);

COMMIT;
