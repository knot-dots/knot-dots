-- New MCP tokens expire after 30 days. Existing tokens keep their expiry.
ALTER TABLE mcp_token ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');
