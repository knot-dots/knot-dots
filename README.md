# knot-dots [![CI (app)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml) [![CI (migrate)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-migrate.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-migrate.yaml) [![CI (keycloak)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-keycloak.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-keycloak.yaml) [![CI (drupal)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-drupal.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-drupal.yaml)[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

A [SvelteKit](https://kit.svelte.dev) web application for tracing administrative measures in sustainable communities

## Get started

The development environment relies on [Docker Compose](https://docs.docker.com/compose/) so make sure it is installed on your system.

You can start the SvelteKit app in development mode with all dependant services:

```bash
docker compose up -d --build
```

Visit http://localhost:5173 to verify that it is up and running.

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

## Tests

For end-to-end tests, we use [Playwright](https://playwright.dev/).
The tests are run automatically as part of the continuous integration workflow.
To execute the tests locally run:

```bash
npx playwright install --with-deps
npx playwright test
```

