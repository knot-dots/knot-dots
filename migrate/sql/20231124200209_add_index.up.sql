CREATE INDEX container_payload_objective_idx ON container USING gin ((payload->'objective') jsonb_path_ops);
