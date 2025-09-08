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
