-- New MCP tokens expire after seven days again. Existing tokens keep their expiry.
ALTER TABLE mcp_token ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');
