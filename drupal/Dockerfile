FROM debian:bookworm-slim AS builder
ARG DEBIAN_FRONTEND=noninteractive
ARG COMPOSER_ALLOW_SUPERUSER=1
ENV COMPOSER_HOME=/tmp
RUN apt-get update && apt-get install -y \
	git \
	php8.2-cli \
	php8.2-curl \
	php8.2-gd \
	php8.2-mbstring \
	php8.2-xml \
	unzip \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /srv/app
COPY --from=composer /usr/bin/composer /usr/local/bin/
COPY ./docker-entrypoint.d/composer.sh /usr/local/bin/docker-entrypoint.sh
COPY ./composer.* ./
RUN composer install
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["composer"]

FROM debian:bookworm-slim AS base
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
	libapache2-mod-php8.2 \
	php8.2-apcu \
	php8.2-curl \
	php8.2-gd \
	php8.2-mbstring \
	php8.2-pgsql \
	php8.2-xml \
	postgresql-client \
	wget \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /srv/app
ENV PATH=${PATH}:/srv/app/vendor/bin
COPY ./docker-entrypoint.d/drush-site-install.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=builder /srv/app/vendor ./vendor
COPY --from=builder /srv/app/web ./web
COPY ./composer.json .
COPY ./web/profiles/custom ./web/profiles/custom
COPY ./web/sites/default/services.yml ./web/sites/default/services.yml
COPY ./web/sites/default/settings.php ./web/sites/default/settings.php
RUN mkdir ./web/files && chown www-data:www-data ./web/files
RUN ln -sf /proc/self/fd/1 /var/log/apache2/access.log
RUN ln -sf /proc/self/fd/2 /var/log/apache2/error.log
RUN sed -i 's/Listen 80/Listen 8000/g' /etc/apache2/ports.conf
RUN a2enmod \
	expires \
	headers \
	rewrite
COPY ./drupal.conf /etc/apache2/sites-available/drupal.conf
RUN a2ensite drupal
EXPOSE 8000
CMD ["/usr/sbin/apache2ctl", "-DFOREGROUND"]

FROM base AS production
