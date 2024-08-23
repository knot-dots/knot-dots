CREATE INDEX container_payload_idx ON container
    USING gin (jsonb_to_tsvector('german', payload, '["string", "numeric"]'));
