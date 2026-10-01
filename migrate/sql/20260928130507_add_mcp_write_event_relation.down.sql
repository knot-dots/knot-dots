BEGIN;

ALTER TABLE mcp_write_event
    DROP COLUMN related_container_guid,
    DROP COLUMN predicate;

COMMIT;
