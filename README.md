# knot-dots

[![CI (app)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml) [![CI (import)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-import.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml) [![CI (migrate)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-migrate.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-migrate.yaml) [![CI (keycloak)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-keycloak.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-keycloak.yaml) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

A [SvelteKit](https://kit.svelte.dev) web application for tracing administrative measures in sustainable communities

## Get started

The development environment relies on [Docker Compose](https://docs.docker.com/compose/) so make sure it is installed on your system.

You can start the SvelteKit app in development mode with all dependent services:

```bash
docker compose up -d --build
```

Visit http://localhost:5173 to verify that it is up and running.

To use the identity provider service, add the following line to /etc/hosts:

```
127.0.0.1      keycloak
```

The identity provider is initialised with a sysadmin user. Use these credentials to sign in:

```
Email: admin@knotdots.net
Password: test
```

## Database

We use PostgreSQL with [Slonik](https://github.com/gajus/slonik). 
Please read its [about section](https://github.com/gajus/slonik#about-slonik) before writing database queries. 

Migrations are written in SQL and managed with [golang-migrate/migrate](https://github.com/golang-migrate/migrate).
The tool provides a command for creating new migrations:

```bash
docker compose run --rm migrate create -ext sql NAME
```

This will produce two empty files in the migrate/sql folder,
one for upgrading the schema and one for restoring the current state.

## Elasticsearch

We use Elasticsearch for fast full-text search and faceted filtering.
The Elasticsearch feature is controlled by the `Elasticsearch` feature flag (configured in `app/src/lib/features.ts`).

To index containers to Elasticsearch, run:

```bash
docker-compose run --rm import index-containers-to-elasticsearch
```

This will create a new index with a timestamp (e.g., `containers-20251218102418`) and point the `containers` alias to it for zero-downtime reindexing.

## Tests

For end-to-end tests, we use [Playwright](https://playwright.dev/).
The tests are run automatically as part of the continuous integration workflow.
To execute the tests locally run:

```bash
npx playwright install --with-deps
npx playwright test
```

## Commit messages

Please follow the seven rules explained in [How to Write a Git Commit Message](https://cbea.ms/git-commit/).
