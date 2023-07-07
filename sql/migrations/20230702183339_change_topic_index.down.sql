DROP INDEX container_payload_topic_idx;
CREATE INDEX container_payload_topic_idx ON container USING hash ((payload->>'topic'));
