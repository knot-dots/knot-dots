ALTER TABLE container ADD COLUMN managed_by uuid;
UPDATE container SET managed_by = organization WHERE organizational_unit IS NULL;
UPDATE container SET managed_by = organizational_unit WHERE organizational_unit IS NOT NULL;
ALTER TABLE container ALTER COLUMN managed_by  SET NOT NULL;
