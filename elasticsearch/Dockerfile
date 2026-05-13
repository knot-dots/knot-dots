ARG ELASTICSEARCH_VERSION
FROM docker.elastic.co/elasticsearch/elasticsearch:${ELASTICSEARCH_VERSION}
RUN elasticsearch-plugin install analysis-icu
COPY dictionary.txt /usr/share/elasticsearch/config/dictionary/
