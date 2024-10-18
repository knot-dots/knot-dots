CREATE INDEX container_payload_template_idx ON container ((payload->>'template'));
DROP INDEX container_payload_idx;
ALTER INDEX container_payload_full_text_idx RENAME TO container_payload_idx;
