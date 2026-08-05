-- Prepare custom collection filters for the new organization scope semantics:
-- an explicit organization value now means organization-level content only
-- (organizational_unit IS NULL), so existing rule-based collections receive
-- the organizational units they implicitly covered before as explicit values.
-- Item-based collections (e.g. municipality profiles) are left untouched.
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
	AND jsonb_array_length(COALESCE(payload->'filter'->'organizationalUnit', '[]'::jsonb)) > 0;

-- 2. Collections with explicit organization values and no organizational unit
--    filter meant "whole organization". Add all current organizational units
--    of the listed organizations so no content disappears.
UPDATE container c
SET payload = jsonb_set(c.payload, '{filter,organizationalUnit}',
	COALESCE((
		SELECT jsonb_agg(DISTINCT ou.guid::text)
		FROM container ou
		JOIN jsonb_array_elements_text(c.payload->'filter'->'organization') org(guid)
			ON ou.organization = org.guid::uuid
		WHERE ou.payload->>'type' = 'organizational_unit'
			AND ou.valid_currently
			AND NOT ou.deleted
	), '[]'::jsonb))
WHERE c.payload->>'type' = 'custom_collection'
	AND jsonb_array_length(COALESCE(c.payload->'item', '[]'::jsonb)) = 0
	AND jsonb_array_length(COALESCE(c.payload->'filter'->'organization', '[]'::jsonb)) > 0
	AND jsonb_array_length(COALESCE(c.payload->'filter'->'organizationalUnit', '[]'::jsonb)) = 0;

-- 3. Rule-based collections without any organization or organizational unit
--    filter fell back to the current organization including all of its
--    organizational units at render time. Set the container's own
--    organization and all of its current organizational units.
UPDATE container c
SET payload = jsonb_set(c.payload, '{filter}',
	COALESCE(c.payload->'filter', '{}'::jsonb) || jsonb_build_object(
		'organization', to_jsonb(ARRAY[c.organization::text]),
		'organizationalUnit', COALESCE((
			SELECT jsonb_agg(DISTINCT ou.guid::text)
			FROM container ou
			WHERE ou.payload->>'type' = 'organizational_unit'
				AND ou.organization = c.organization
				AND ou.valid_currently
				AND NOT ou.deleted
		), '[]'::jsonb)))
WHERE c.payload->>'type' = 'custom_collection'
	AND jsonb_array_length(COALESCE(c.payload->'item', '[]'::jsonb)) = 0
	AND jsonb_array_length(COALESCE(c.payload->'filter'->'organization', '[]'::jsonb)) = 0
	AND jsonb_array_length(COALESCE(c.payload->'filter'->'organizationalUnit', '[]'::jsonb)) = 0
	AND EXISTS (
		SELECT 1
		FROM jsonb_each(COALESCE(c.payload->'filter', '{}'::jsonb)) f(key, value)
		WHERE jsonb_typeof(f.value) = 'array' AND jsonb_array_length(f.value) > 0
	);

COMMIT;
