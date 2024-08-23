CREATE INDEX container_payload_category_idx ON container USING hash ((payload->>'category'));
CREATE INDEX container_payload_title_idx ON container USING btree ((payload->>'title'));
