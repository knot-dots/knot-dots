DROP INDEX container_payload_template_idx;
ALTER INDEX container_payload_idx RENAME TO container_payload_full_text_idx;
CREATE INDEX container_payload_idx ON container USING gin (payload);
