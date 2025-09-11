DROP TABLE spatial_feature;

ALTER TABLE administrative_area_open_street_map DROP COLUMN boundary;
ALTER TABLE administrative_area_open_street_map ADD COLUMN boundary geometry;
