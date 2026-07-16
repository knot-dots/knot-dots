BEGIN;

ALTER TABLE container RENAME COLUMN managed_by_legacy TO managed_by;
ALTER INDEX container_managed_by_legacy_idx RENAME TO container_managed_by_idx;

COMMIT;
