DROP INDEX container_payload_audience_idx;
DROP INDEX container_payload_category_idx;
DROP INDEX container_payload_objective_idx;
DROP INDEX container_payload_organization_category_idx;
DROP INDEX container_payload_strategy_type_idx;
DROP INDEX container_payload_task_category_idx;
DROP INDEX container_payload_topic_idx;
DROP INDEX container_payload_type_idx;
DROP INDEX container_user_object_idx;

CREATE INDEX container_payload_organization_category_idx ON container ((payload->>'organizationCategory'));
CREATE INDEX container_payload_strategy_type_idx ON container ((payload->>'strategyType'));
CREATE INDEX container_payload_task_category_idx ON container ((payload->>'taskCategory'));
CREATE INDEX container_payload_type_idx ON container ((payload->>'type'));
CREATE INDEX container_user_object_idx ON container_user (object);

ALTER INDEX container_organization_unit_idx RENAME TO container_organizational_unit_idx;
