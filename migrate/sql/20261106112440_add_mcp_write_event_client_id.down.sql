BEGIN;

ALTER TABLE mcp_write_event
    DROP COLUMN client_id;

COMMIT;
