ALTER TABLE container ADD type varchar(32);
UPDATE container SET type = payload->>'type';
UPDATE container SET payload = jsonb_set_lax(payload, '{"type"}', null, false, 'delete_key');
DROP INDEX container_payload_type_idx;
CREATE INDEX container_type_idx ON container (type);
