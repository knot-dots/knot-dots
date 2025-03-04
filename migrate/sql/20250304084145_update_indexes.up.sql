DROP INDEX container_valid_currently_idx;
CREATE INDEX container_valid_currently_idx ON container (valid_currently) WHERE valid_currently;
CREATE UNIQUE INDEX container_guid_key ON container (guid) WHERE valid_currently;
