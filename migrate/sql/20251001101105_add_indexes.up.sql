CREATE INDEX container_guid_idx ON container (guid);
CREATE INDEX container_managed_by_idx ON container (managed_by);
CREATE INDEX container_payload_assignee_idx ON container USING GIN ((payload->'assignee'));
