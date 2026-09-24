BEGIN;

CREATE TABLE mcp_write_event (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES mcp_token (id) ON DELETE SET NULL,
    user_id uuid NOT NULL,
    tool text NOT NULL CHECK (btrim(tool) <> ''),
    container_guid uuid NOT NULL,
    revision integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mcp_write_event_token_id_idx ON mcp_write_event (token_id);
CREATE INDEX mcp_write_event_container_guid_idx ON mcp_write_event (container_guid);

COMMIT;
