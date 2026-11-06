# knot-dots

[![CI (app)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml) [![CI (import)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-import.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-app.yaml) [![CI (migrate)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-migrate.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-migrate.yaml) [![CI (keycloak)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-keycloak.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-keycloak.yaml) [![CI (elasticsearch)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-elasticsearch.yaml/badge.svg)](https://github.com/knot-dots/knot-dots/actions/workflows/ci-elasticsearch.yaml) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

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

To index containers to Elasticsearch, run:

```bash
docker-compose run --rm import index-containers-to-elasticsearch
```

This will create a new index with a timestamp (e.g., `containers-20251218102418`) and point the `containers` alias to it for zero-downtime reindexing.

## MCP

The MCP server at `/mcp` accepts two kinds of bearer tokens:

- personal access tokens (`mcp_pat_…`) that users create under Settings → MCP access tokens,
- OAuth access tokens that Keycloak issues to the public client `knot-dots-mcp`, which all MCP apps share.
  `/.well-known/oauth-protected-resource/mcp` tells apps where to get them.

Both work only where the `McpServer` pod annotation is enabled, and only for users with the `MCP` feature flag.
Users find the server URL and the client ID in Settings → MCP access tokens.
They disconnect apps in Keycloak's account console under Applications, where all apps share one entry.

When MCP leaves alpha and the flag no longer gates access, `/mcp` has to create users from the token claims:
a Keycloak user may never have signed in to the web application.

### Keycloak setup

`keycloak/import/knot-dots.json` contains the setup for fresh local realms.
Existing realms, including production, need the same settings in the admin console:

1. Client scopes `containers:read`, `containers:write`, `organizations:read` and `users:read`,
   with "Include in token scope" and "Display on consent screen" on,
   and the consent texts `${mcpScopeContainersRead}`, `${mcpScopeContainersWrite}`, `${mcpScopeOrganizationsRead}` and `${mcpScopeUsersRead}`
   from `keycloak/themes/knot-dots/login/messages`.
2. Client `knot-dots-mcp` named `${mcpClientName}`:
   - Client authentication off, only the standard flow, consent required, PKCE method S256.
   - Valid redirect URIs `https://claude.ai/api/mcp/auth_callback`, `https://vscode.dev/redirect`,
     `http://127.0.0.1/*` and `http://localhost/*`.
     Without a port, Keycloak accepts any loopback port, which Claude Code and VS Code need.
     Add ChatGPT's callback once it is confirmed.
   - Full scope allowed off, so realm roles stay out of the tokens.
   - Default client scopes `basic`, `offline_access`, `containers:read`, `containers:write` and `organizations:read`.
     As a default scope, `offline_access` makes every connection an offline session,
     which ends after the realm's offline session idle time (30 days) without use.
   - Optional client scope `users:read`. Apps do not get it when they connect:
     the user search tool asks them to request it, and the user consents to it separately.
   - An audience mapper with "Included Custom Audience" set to `PUBLIC_BASE_URL` + `/mcp`, for the access token only.
     The local realm has one each for the dev server and the preview, and allows the origin of the MCP Inspector.
3. `PUBLIC_KC_MCP_CLIENT_ID=knot-dots-mcp` in the app's environment.

Locally, `KC_MCP_URL=http://localhost:8080` points MCP clients to Keycloak by `localhost` instead of `keycloak`:
they send token requests over plain HTTP to loopback hosts only.
Keycloak names the URL a token was requested at as its issuer, so the app verifies tokens against this URL.
Leave it unset where Keycloak is served over HTTPS.

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
