ALTER TABLE "user" ADD column settings jsonb DEFAULT '{}';
CREATE INDEX user_settings_idx ON "user" USING gin (settings);
