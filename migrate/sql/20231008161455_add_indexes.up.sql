CREATE INDEX container_payload_organization_category_idx ON container USING hash ((payload->>'organizationCategory'));
CREATE INDEX container_payload_task_category_idx ON container USING hash ((payload->>'taskCategory'));
