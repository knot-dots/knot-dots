CREATE TABLE indicator_wegweiser_kommune (
    calculation text NOT NULL,
    color_schema varchar(20),
    decimal_places int,
    explanation text,
    friendly_url varchar(200),
    hint text,
    id int NOT NULL,
    maximum_classification float,
    maximum_region_type varchar(20),
    minimum_classification float,
    minimum_region_type varchar(20),
    name varchar(200) NOT NULL,
    source varchar(200) NOT NULL,
    top_low_regions_available boolean,
    topics varchar(100)[],
    title varchar(200) NOT NULL,
    type varchar(20) NOT NULL,
    unit varchar(200),
    years int[],
    valid_from timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX indicator_wegweiser_kommune_friendly_url_key ON indicator_wegweiser_kommune (friendly_url, valid_from);

CREATE TABLE indicator_data_wegweiser_kommune (
    indicator_id int NOT NULL,
    spatial_reference uuid REFERENCES spatial_feature(guid) ON DELETE SET NULL,
    actual_values jsonb,
    valid_from timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX indicator_data_wegweiser_kommune_key ON indicator_data_wegweiser_kommune (indicator_id, spatial_reference, valid_from);
