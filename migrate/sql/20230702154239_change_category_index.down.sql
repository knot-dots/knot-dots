DROP INDEX container_payload_category_idx;
CREATE INDEX container_payload_category_idx ON container USING hash ((payload->>'category'));
