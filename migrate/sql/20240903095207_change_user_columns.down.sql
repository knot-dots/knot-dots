ALTER TABLE "user" ADD COLUMN display_name VARCHAR(64) DEFAULT '';
UPDATE "user" SET display_name = given_name || ' ' || family_name;
ALTER TABLE "user" DROP COLUMN family_name;
ALTER TABLE "user" DROP COLUMN given_name;
