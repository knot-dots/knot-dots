ALTER TABLE container_relation ADD COLUMN position integer NOT NULL DEFAULT 0;
CREATE INDEX container_relation_position_idx ON container_relation (position);
