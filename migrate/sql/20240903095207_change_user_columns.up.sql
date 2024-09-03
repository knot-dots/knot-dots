ALTER TABLE "user" ADD COLUMN family_name VARCHAR(32) DEFAULT '';
ALTER TABLE "user" ADD COLUMN given_name VARCHAR(32) DEFAULT '';
UPDATE "user" SET given_name = split_part(display_name, ' ', 1), family_name = split_part(display_name, ' ', 2);
ALTER TABLE "user" DROP COLUMN display_name;
