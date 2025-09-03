FROM postgres:16
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-16-postgis \
  && rm -rf /var/lib/apt/lists/*
