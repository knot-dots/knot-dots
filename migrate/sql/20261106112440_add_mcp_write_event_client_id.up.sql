BEGIN;

-- Writes made with an OAuth access token have no personal access token. They
-- record the OAuth client the token was issued to instead.
ALTER TABLE mcp_write_event
    ADD COLUMN client_id text CHECK (btrim(client_id) <> '');

COMMIT;
