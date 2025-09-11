CREATE TABLE spatial_feature (
    guid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geom geometry(Geometry, 4326) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX spatial_feature_geom_idx ON spatial_feature USING gist (geom);

ALTER TABLE administrative_area_open_street_map DROP COLUMN boundary;
ALTER TABLE administrative_area_open_street_map ADD COLUMN boundary uuid REFERENCES spatial_feature(guid);
