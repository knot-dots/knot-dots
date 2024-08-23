UPDATE container SET payload = jsonb_set(payload, '{"type"}', to_jsonb(type), true);
ALTER TABLE container DROP type;
CREATE INDEX container_payload_type_idx ON container USING hash ((payload->>'type'));
