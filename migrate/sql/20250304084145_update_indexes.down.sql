DROP INDEX container_guid_key;
DROP INDEX container_valid_currently_idx;
CREATE INDEX container_valid_currently_idx ON container (valid_currently);
