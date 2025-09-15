CREATE EXTENSION postgis;

CREATE TABLE spatial_feature (
     guid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     geom geometry(Geometry, 4326) NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX spatial_feature_geom_idx ON spatial_feature USING gist (geom);

CREATE TABLE administrative_area_bbsr (
      area float NOT NULL,
      name varchar(1000) NOT NULL,
      official_municipality_key char(8) NOT NULL,
      official_regional_code char(12) NOT NULL,
      population int NOT NULL,
      city_and_municipality_type varchar(20) NOT NULL,
      valid_from timestamp with time zone default now()
);

CREATE UNIQUE INDEX administrative_area_bbsr_omk_key ON administrative_area_bbsr (official_municipality_key);
CREATE UNIQUE INDEX administrative_area_bbsr_orc_key ON administrative_area_bbsr (official_regional_code);

CREATE TABLE administrative_area_open_street_map (
     boundary uuid REFERENCES spatial_feature(guid),
     name varchar(1000) NOT NULL,
     official_municipality_key char(8),
     official_regional_code char(12),
     relation_id int NOT NULL,
     wikidata_id varchar(100),
     valid_from timestamp with time zone default now()
);

CREATE UNIQUE INDEX administrative_area_osm_omk_key ON administrative_area_open_street_map (official_municipality_key, valid_from);
CREATE UNIQUE INDEX administrative_area_osm_orc_key ON administrative_area_open_street_map (official_regional_code, valid_from);
CREATE UNIQUE INDEX administrative_area_osm_relation_id_key ON administrative_area_open_street_map (relation_id, valid_from);
CREATE UNIQUE INDEX administrative_area_osm_wikidata_id_key ON administrative_area_open_street_map (wikidata_id, valid_from);

CREATE TABLE administrative_area_wegweiser_kommune (
       demographic_type int NOT NULL,
       friendly_url varchar(1000) NOT NULL,
       id int NOT NULL,
       name varchar(1000) NOT NULL,
       official_municipality_key varchar(8) NOT NULL,
       official_regional_code varchar(12) NOT NULL,
       parent varchar(1000),
       small_region_replacement boolean,
       title varchar(1000) NOT NULL,
       type varchar(20) NOT NULL,
       valid_from timestamp with time zone DEFAULT now()
);

CREATE TABLE administrative_area_wikidata (
      area float,
      coat_of_arms varchar(1000),
      country char(2) NOT NULL,
      id varchar(100) NOT NULL,
      name varchar(1000) NOT NULL,
      official_municipality_key char(8),
      official_regional_code char(12),
      open_street_map_relation_id int NOT NULL,
      population int,
      valid_from timestamp with time zone default now()
);

CREATE UNIQUE INDEX administrative_area_wd_id_key ON administrative_area_wikidata (id, valid_from);
CREATE UNIQUE INDEX administrative_area_wd_omk_key ON administrative_area_wikidata (official_municipality_key, valid_from);
CREATE UNIQUE INDEX administrative_area_wd_orc_key ON administrative_area_wikidata (official_regional_code, valid_from);
CREATE UNIQUE INDEX administrative_area_wd_osm_relation_id_key ON administrative_area_wikidata (open_street_map_relation_id, valid_from);
