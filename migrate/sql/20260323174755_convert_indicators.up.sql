BEGIN;

-- Create actual_data containers for indicators with historical values
-- referencing an indicator_template container
WITH guid_map AS (
    SELECT c.guid, gen_random_uuid() as new_guid
    FROM container c
    JOIN container it ON it.guid::text = c.payload->>'quantity'
    WHERE c.payload->>'type' = 'indicator'
      AND jsonb_array_length(c.payload->'historicalValues') > 0
      AND c.valid_currently
      AND it.valid_currently
), indicators AS (
    SELECT c.*, guid_map.new_guid
    FROM container c
    JOIN guid_map ON guid_map.guid = c.guid
    JOIN container it ON it.guid::text = c.payload->>'quantity'
    WHERE c.payload->>'type' = 'indicator'
      AND jsonb_array_length(c.payload->'historicalValues') > 0
      AND it.valid_currently
)
INSERT INTO container (deleted, guid, managed_by, organization, organizational_unit, payload, valid_currently, valid_from, realm)
SELECT deleted, new_guid, managed_by, organization, organizational_unit, jsonb_build_object('indicator', payload->'quantity', 'title', payload->>'title', 'type', 'actual_data', 'values', payload->'historicalValues', 'visibility', payload->>'visibility' ), valid_currently, valid_from, realm
FROM indicators;

-- Substitute indicator_template container for indicator container as the
-- object of relations with objectives and effects.
WITH indicators AS (
    SELECT c.*
    FROM container c
    JOIN container it ON it.guid::text = c.payload->>'quantity'
    WHERE c.payload->>'type' = 'indicator'
      AND it.valid_currently
)
UPDATE container_relation SET object = (c.payload->>'quantity')::uuid
FROM indicators c
WHERE container_relation.object = c.guid
  AND container_relation.predicate IN ('is-measured-by', 'defines-objective-for');

-- Remove the indicator containers referencing an indicator_template container
WITH indicators AS (
    SELECT c.*
    FROM container c
    JOIN container it ON it.guid::text = c.payload->>'quantity'
    WHERE c.payload->>'type' = 'indicator'
)
DELETE FROM container WHERE container.guid IN (SELECT guid FROM indicators);

-- Create actual_data containers for remaining indicator containers with
-- historical values
WITH indicators AS (
    SELECT c.*
    FROM container c
    WHERE c.payload->>'type' = 'indicator'
      AND jsonb_array_length(c.payload->'historicalValues') > 0
)
INSERT INTO container (managed_by, organization, organizational_unit, payload, valid_currently, valid_from, realm)
SELECT managed_by, organization, organizational_unit, jsonb_build_object('indicator', guid, 'title', payload->>'title', 'type', 'actual_data', 'values', payload->'historicalValues', 'visibility', payload->>'visibility' ), valid_currently, valid_from, realm
FROM indicators;

-- Convert remaining indicator containers to indicator_template containers
WITH indicators AS (
    SELECT c.*
    FROM container c
    WHERE c.payload->>'type' = 'indicator'
)
UPDATE container
SET payload = jsonb_set(payload, '{type}', '"indicator_template"') - 'historicalValues' - 'quantity'
WHERE payload->>'type' = 'indicator';

COMMIT;
