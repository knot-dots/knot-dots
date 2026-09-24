BEGIN;

CREATE TABLE mcp_token (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES "user" (guid) ON DELETE CASCADE,
    name text NOT NULL CHECK (btrim(name) <> ''),

    secret_hash bytea NOT NULL UNIQUE
        CHECK (octet_length(secret_hash) = 32),
    prefix varchar(16) NOT NULL,

    scopes text[] NOT NULL DEFAULT ARRAY[]::text[]
        CHECK (array_position(scopes, NULL) IS NULL),

    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'), 
    last_used_at timestamptz,
    revoked_at timestamptz,

    CHECK (expires_at > created_at),
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX mcp_token_user_id_idx ON mcp_token (user_id);

COMMIT;
