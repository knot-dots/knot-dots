ALTER TABLE container ADD COLUMN organization uuid NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX container_organization_idx ON container (organization);
