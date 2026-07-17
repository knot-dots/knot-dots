BEGIN;

ALTER TABLE container RENAME COLUMN managed_by_legacy TO managed_by;
ALTER INDEX container_managed_by_legacy_idx RENAME TO container_managed_by_idx;
-- New revisions written after the up migration left managed_by NULL. Backfill
-- them before restoring the NOT NULL constraint.
UPDATE container
SET managed_by = coalesce(organizational_unit, organization)
WHERE managed_by IS NULL;
ALTER TABLE container ALTER COLUMN managed_by SET NOT NULL;

COMMIT;
