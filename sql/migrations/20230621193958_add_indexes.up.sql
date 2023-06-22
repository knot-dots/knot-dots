CREATE INDEX container_payload_topic_idx ON container USING hash ((payload->>'topic'));
CREATE INDEX container_payload_strategy_type_idx ON container USING hash ((payload->>'strategyType'));
