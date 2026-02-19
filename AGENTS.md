# AI Agent Guide for knot-dots

Welcome to the **knot-dots** codebase. This project is a SvelteKit application designed for tracing administrative measures in sustainable communities.

## 🚀 Project Overview

- **Architecture:** Monorepo using npm workspaces (`app`, `import`, `worker`, `shared`).
- **Frontend:** Svelte 5 (Runes-based), Vanilla CSS.
- **Backend:** SvelteKit (server-side logic in `+page.server.ts` and `+layout.server.ts`).
- **Database:** PostgreSQL with **Slonik** as the client.
- **Identity Provider:** Keycloak.
- **Search:** Elasticsearch.
- **Background Jobs:** Uses **ElasticMQ** (SQS-compatible) for task queuing, with an `indexing-worker` service.
- **Storage:** Local S3 mock (S3Mock) for file uploads.
- **Infrastructure:** Fully dockerized development environment.

## 🧠 Core Data Concept: Containers & Payloads

The application uses a highly flexible **Container/Payload** pattern. Understanding this is critical:

- **Container:** The base entity (see `app/src/lib/models.ts`). Every data object (Goal, Measure, Task, etc.) is a container.
- **Payload:** The specific data content stored as JSONB in the `container` table. Each payload type has a corresponding Zod schema (e.g., `goalPayload`, `measurePayload`).
- **Relations:** Containers are linked via the `container_relation` table using predicates (e.g., `is-part-of`, `is-measured-by`).
- **Revisions:** Data is versioned. Only the revision with `valid_currently = true` and `deleted = false` is active.

## 🛠 Tech Stack & Conventions

### 1. Svelte 5 Runes

Always use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`). Avoid Svelte 4's `export let` or store-heavy patterns where runes are more appropriate.

### 2. Database with Slonik

- **NEVER** use raw template strings for queries.
- **ALWAYS** use the `sql` tag from `app/src/lib/server/db.ts`.
- **Typing:** Use `sql.typeAlias('anyContainer')` or `sql.type(zodSchema)` to ensure query results match expected types.
- **Transactions:** Group related operations into transactions using `connection.transaction()`.

### 3. Validation with Zod

Use Zod for all data validation. The "Source of Truth" for the data model is `app/src/lib/models.ts`.

### 4. Styling (Vanilla CSS)

The project favors **Vanilla CSS** with a strong reliance on CSS variables for theming and consistency. See `app/src/app.css` for the design system tokens.

### 5. AI Integration

The project has built-in features for extracting data from PDFs (measures, goals, knowledge). These are handled in `app/src/lib/server/ai.ts` and `knowledge-ai.ts` via external AI services.

### 6. Authorization with CASL

- Check permissions using `$ability.can(action, subject, field?)` from stores
- Use `$mayCreateContainer(payloadType, managedBy)` helper for container creation checks
- Always verify permissions server-side in `+page.server.ts` and API endpoints
- Permission definitions in `app/src/lib/authorization.ts`

**Example:**

```typescript
if (!defineAbilityFor(locals.user).can("create", container)) {
  error(403, { message: $_("error.forbidden") });
}
```

### 7. Global State Management

- **`$applicationState`**: UI state (edit mode, detail view settings, overlay states)
- **`$ability`**: Current user's permissions (CASL ability instance)
- **`$overlay`**, **`$dragged`**: UI interaction state for drag-and-drop and overlays
- **Principle**: Avoid creating custom stores - use runes in components when possible
- Only use stores for truly global, cross-component shared state

### 8. Boards Configuration

Organizations and organizational units can enable specific "boards" (feature modules):

- **`board.indicators`**: Enables indicator management and activation features
- **`board.organizational_units`**: Enables organizational structure management
- Configure via organization/org unit payload: `{ boards: ['board.indicators', ...] }`
- UI features are conditionally rendered based on enabled boards
- Check board availability: `organization.payload.boards.includes('board.indicators')`

### 9. Modern Svelte 5 Component Patterns

- **Snippets**: Use for component composition and slot-like behavior
  ```svelte
  {#snippet header()}
    <h1>Title</h1>
  {/snippet}
  <Component>{@render header()}</Component>
  ```
- **Dialogs**: Native `<dialog>` element with `.showModal()` and `.close()`
- **Resource management**: Use `resource()` from 'runed' for async data fetching with automatic cancellation
  ```typescript
  const data = resource(
    () => deps,
    async ([dep], _, { signal }) => {
      return await fetch(url, { signal });
    },
    { debounce: 300 },
  );
  ```
- **Headless UI**: Use 'svelte-headlessui' for accessible disclosure/menu/popover patterns

### 10. Internationalization (i18n)

- Use `$_('translation.key')` from 'svelte-i18n' for all user-facing text
- Translations in `app/src/lib/locales/{de,en}.json`
- **Always add translations for both languages** when adding new text
- Use `$number()` for number formatting with locales
- Support pluralization: `$_('key', { values: { count: n } })` with ICU MessageFormat

## 📋 Engineering Standards

- **Commit Messages:** Strictly follow [cbea.ms rules](https://cbea.ms/git-commit/).
- **Linting & Formatting:** Run `npm run lint` and `npm run format` before finalizing changes.
- **Testing:**
  - **Unit/Integration:** Use Vitest (`app/src/lib/**/*.test.ts`).
  - **E2E:** Use Playwright (`app/tests`).
  - **Page Objects:** Encapsulate page interactions in classes (e.g., `DotsBoard`, `IndicatorCatalog` in `app/tests/`).
  - **Fixtures:** Test data created in `tests/fixtures.ts` with worker-scoped lifecycle.
  - **Auth Context:** Use `test.use({ storageState: 'tests/.auth/admin.json' })` for authenticated tests.
  - **Best Practice:** Always test permission boundaries and feature flag toggles.
- **Migrations:** Managed via `golang-migrate`. Create new ones using:
  ```bash
  docker compose run --rm migrate create -ext sql NAME
  ```

## 🔍 Key File Locations

- `app/src/lib/models.ts`: Core Zod schemas and types (SOURCE OF TRUTH).
- `app/src/lib/server/db.ts`: All database access logic and query functions.
- `app/src/lib/stores.ts`: Global application state and reactive stores.
- `app/src/lib/authorization.ts`: CASL permission definitions and ability builder.
- `app/src/routes/`: Application pages and API endpoints.
- `app/tests/`: E2E test specs, page objects, and fixtures.
- `migrate/sql/`: SQL schema migrations.
- `app/src/app.css`: Global CSS variables and design system tokens.
- `app/src/lib/locales/`: Translation files (de.json, en.json).

## ⚡ Performance Best Practices

- **Debounce user input:** Search inputs should use 300ms debounce (via `resource()` options)
- **Batch database operations:** Always use transactions for related write operations
- **Memoize with `$derived`:** Use for expensive computations, not simple property access
- **Reactive collections:** Native Map and Set do not trigger deep reactivity. Use import { SvelteMap, SvelteSet } from 'svelte/reactivity' for efficient, reactive lookups.
- **Avoid state in derived:** Never create `$state()` inside `$derived()` - leads to memory leaks

## 💡 Workflow Tips for AI Agents

1. **Research the Model:** Always check `app/src/lib/models.ts` when dealing with data.
2. **Surgical DB Updates:** Add new database functions to `app/src/lib/server/db.ts` and verify them with unit tests.
3. **Runes check:** Ensure all new `.svelte` components strictly follow Svelte 5 conventions.
4. **Consistency:** Match the exact indentation and style of existing Slonik queries.
5. **Permissions first:** Check authorization before implementing features - use `$ability` and `$mayCreateContainer`.
6. **Test with fixtures:** Use existing test fixtures and page objects for E2E tests.
7. **Board awareness:** Check if features require specific boards to be enabled in organization config.
8. **i18n completeness:** Never hardcode strings - add translations for both DE and EN.
