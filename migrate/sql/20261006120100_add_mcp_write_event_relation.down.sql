BEGIN;

ALTER TABLE mcp_write_event
    DROP CONSTRAINT IF EXISTS mcp_write_event_relation_check,
    DROP COLUMN IF EXISTS related_container_guid,
    DROP COLUMN IF EXISTS predicate;

COMMIT;
