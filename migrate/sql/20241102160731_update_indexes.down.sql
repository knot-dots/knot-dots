DROP INDEX container_payload_organization_category_idx;
DROP INDEX container_payload_strategy_type_idx;
DROP INDEX container_payload_task_category_idx;
DROP INDEX container_payload_type_idx;
DROP INDEX container_user_object_idx;

CREATE INDEX container_payload_audience_idx ON container ((payload->>'audience'));
CREATE INDEX container_payload_category_idx ON container USING gin ((payload->'category'));
CREATE INDEX container_payload_objective_idx ON container USING gin ((payload->'objective') jsonb_path_ops);
CREATE INDEX container_payload_organization_category_idx ON container USING hash ((payload->>'organizationCategory'));
CREATE INDEX container_payload_strategy_type_idx ON container ((payload->>'strategyType'));
CREATE INDEX container_payload_task_category_idx ON container USING hash ((payload->>'taskCategory'));
CREATE INDEX container_payload_topic_idx ON container USING gin ((payload->'topic'));
CREATE INDEX container_payload_type_idx ON container USING hash ((payload->>'type'));
CREATE INDEX container_user_object_idx ON container_relation (object);

ALTER INDEX container_organizational_unit_idx RENAME TO container_organization_unit_idx;
