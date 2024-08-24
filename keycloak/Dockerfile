FROM quay.io/keycloak/keycloak:25.0.2 AS builder
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_DB=postgres
WORKDIR /opt/keycloak
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:25.0.2 AS production
COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY ./themes /opt/keycloak/themes
