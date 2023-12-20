CREATE INDEX container_payload_slug_idx ON container ((payload->>'slug'));
