# MCP server work — handoff

State as of 2026-09-28. Author of the work: Niels Neumann. This file is a
working note, not part of the codebase; don't commit it.

## Goal

knot-dots exposes an MCP server at `/mcp` (`app/src/routes/mcp/+server.ts`,
`app/src/lib/server/mcp/`). Clients authenticate with personal access tokens
(`mcp_pat_…`, managed at `/me/settings/tokens`) that carry scopes
(`app/src/lib/server/mcp/scopes.ts`: `containers:read`, `containers:write`,
`organizations:read`, `users:read`). Read tools are on `main` (#710). Write
tools (`create_container`, `add_custom_collection_section`, `update_container`)
are built on local branches and waiting to become PRs.

## Background you need

- Authorization is **per-container**: `defineAbilityFor`
  (`app/src/lib/authorization.ts`) checks `container.user_grant`, which the
  read paths attach via `enrichContainers` → `applyUserGrants(getRequestUser())`
  (`app/src/lib/server/computeUserGrants.ts`). The request user comes from an
  AsyncLocalStorage set by `withRequestUser` (`app/src/lib/server/requestUser.ts`)
  from `locals.user`.
- MCP requests authenticate by bearer token **inside the route**, so
  `locals.user` is anonymous and `getRequestUser()` is `''`. Every MCP function
  that loads containers is therefore wrapped in `runAsRequestUser(guid, fn)`
  (in `requestUser.ts`). This includes the write tools.
- Creating is authorized against grants derived from the parent
  (`grantForNewContainer(parent)`); `containerOfType(type, scope)` takes the
  scope container.
- MCP server SDK is 2.1: modern requests need an `MCP-Protocol-Version` header
  (tests send it).
- Vitest: most `*.database.test.ts` and some other server tests need a live
  Postgres; Niels runs those. Without DB you can run, from `app/`:
  `npx vitest run src/lib/server/mcp src/routes/me src/routes/container src/lib/server/containerUpdate.test.ts src/lib/models.test.ts --exclude '**/*.database.test.ts'`.
  Type check: `npm run check -- --threshold error` in `app/`.
- Known unrelated failure: `src/lib/server/db.test.ts` "getManyContainers and
  getManyContainersWithES: …" needs a seeded organization named `Musterhausen`
  that no fixture creates. Ignore for now (agreed with Niels).

## Decided direction

**No token authentication in `hooks.server.ts` for now** (decided
2026-09-28). This rules out the earlier idea of having MCP write tools call
the HTTP endpoints via `event.fetch`: without the hook, those calls would run
as an anonymous user.

Instead, authorization lives in **shared server functions** that both the
HTTP routes and the MCP tools call:

- create: shared container creation logic (commit "Extract shared container
  creation logic"), used by `POST /container` and `create_container`;
- update: `authorizeContainerUpdate` / `ContainerUpdateError`
  (`app/src/lib/server/containerUpdate.ts`), used by
  `POST /container/[guid=uuid]/revision` and `update_container`;
- `db.ts` stays close to `main` (decided 2026-09-28): `update_container`
  writes through the existing `updateContainer`, like a web revision
  (loaded container + merged payload, editor as `is-creator-of`, relations,
  users, `own_matrix` and `managed_by` as loaded). The only `db.ts` change is
  an optional `afterUpdate` hook inside its transaction (mirrors
  `afterCreate`), used for the audit event.
- No revision lock for now. `update.ts` compares `expectedRevision` with the
  freshly loaded container; overlapping writes fail on the unique index
  `container_guid_key` (`ON container (guid) WHERE valid_currently`), which
  the tool reports as the same conflict. Remaining gap: milliseconds between
  check and write, e.g. a relation change via `/container/[guid]/relation`
  (no new revision) in that moment is undone. Same gap as the web route.

Write audit stays in the MCP tools: `recordMcpWriteEvent` (migration
`mcp_write_event`) records token and tool name.

## Done

- Security fix "Reject revision bodies for a different container" is on
  `main` as `b294b3db`, simplified during review to one condition:
  `if (!parseResult.success || parseResult.data.guid !== params.guid) error(422, parseResult.error)`.
- #710 MCP read tools merged (`a32b2776`).

## Branches (local, not pushed; rebased onto `main` on 2026-09-28)

Each builds on the previous one.

| Branch | Tip | Commits over the previous | Planned PR |
|---|---|---|---|
| `feature/mcp-discovery-tools` | `4cb7e11f` | 6 over `main`: category discovery (incl. tool registration), payload schema resource, payload type allowlist, shared container serializer, shared pagination fields, container output schema derived from the model | 1. Discovery |
| `refactor/shared-container-writes` | `8606be0a` | 3: extract creation logic, extract update checks, `afterUpdate` hook on `updateContainer` | 2. Shared writes (could be folded into 3) |
| `feature/mcp-create-container` | `ff0572d0` | 7: creation tools (`create_container`, `add_custom_collection_section`, `containers:write` option), org user lookup (`users:read` option), docs, DB test, write audit, unit from parents, parent-type checks | 3. Create |
| `feature/mcp-update-container` | `ef01edd0` | 3: `update_container` tool, expected revision checked with `FOR UPDATE` inside the transaction, write-scope label names changes | 4. Update |
| `feature/mcp-relation-tools` | `723e8d8d` | 5: shared relation authorization, relation columns on `mcp_write_event` (migration `20260928130507`), `changeManyContainerRelations`, `list_container_relations`, `add/remove_container_relation` | 5. Relations |
| `feature/mcp-agent-feedback` | `a4b8f7ae` | 3: document conventions (Markdown, revisions, positions, category values), validate category values in create/update, derive sub-measure hierarchy level | 6. Agent feedback |

Rebase notes:
- The old copy of the security fix was dropped (it is on `main` in its new
  form).
- One conflict in `routes/container/[guid=uuid]/revision/+server.ts`, resolved
  by keeping `main`'s combined guid check and putting the shared
  `authorizeContainerUpdate` call after it.
- Verified on **every commit** of the stack: 0 type errors, the non-DB test
  command above passes (114 → 178 tests along the stack), and every module in
  `mcp/tools/` is registered in `server.ts`. DB tests not run yet.
- Restructured on 2026-09-28: the old "user lookup" commit also registered
  the category tools (so discovery alone shipped them unregistered) and the
  write tools. Category registration moved into the discovery commit;
  "Add MCP page authoring tools" + "Replace create_page with generic
  create_container" + the write part of the old user lookup became "Add MCP
  container creation tools" (`create_page` never appears); the user lookup
  commit now only contains the lookup. Final code unchanged apart from the
  test below.
- The `tools/list` test asserts the exact sorted set of tool names in every
  commit that changes it, so an unregistered tool fails the test.
- All commits have message bodies now.
- The earlier payload-only update (`writeContainerRevision`,
  `updateContainerPayload`, `ContainerRevisionConflictError`, pre-rewrite tip
  of the update branch `c8141db9`) was dropped on 2026-09-28 in favour of the
  `afterUpdate` hook.
- Pre-rebase tips (in the reflog if needed): discovery `b189f3a6`, shared
  writes `745f1cc4`, create `5fcdf720`, update `3ced0b91`.

Other branches:
- `feature/mcp-read-tools`, `feature/mcp-tokens`: merged, can be deleted.
- `feature/mcp-server` (`e96653fa`): the original unsplit branch, reference
  only; delete once the stack is merged.
- `bugfix/host-rewrite`: handled separately by Niels.

## Schema reuse from `models.ts` (2026-09-28)

- The tool schemas are converted to JSON Schema by the MCP SDK (`z.toJSONSchema`),
  so anything with a transform or `z.coerce.date()` cannot be used as is.
- `get_container` / `create_container` / `update_container` output is built from
  `createContainerSchema(z.looseObject({ type: payloadTypes }))`, overriding
  only `managed_by` (transform) and `valid_from` (Date → ISO string). The
  payload stays loose: output-direction payload schemas contain
  `.transform(deduplicate)`; the full schema per type is the resource.
- Pagination fields come from `contracts/pagination.ts` (`paginationInput`,
  `nextOffset`); the org unit contract moved to `contracts/organizationalUnits.ts`.
- Deliberately not reused: `payloadPatch` (type unknown until load; validated
  at runtime), `containerSummary`, `userName`, category and section outputs
  (MCP-specific views), parent relations (deliberate narrowing).
- Considered and deferred: a discriminated union of the 9 MCP payload schemas
  in `create_container`'s input (converts fine, ~18 KB for the whole input).

## Relation tools (2026-09-28, branch `feature/mcp-relation-tools`)

Plan: `~/.claude/plans/luminous-bouncing-hamster.md`. Decisions:
- Only semantic predicates (`contracts/relations.ts` `mcpRelationPredicateValues`:
  contributes-to, is-concrete-target-of, is-consistent-with, is-equivalent-to,
  is-inconsistent-with, is-prerequisite-for, is-sub-target-of,
  is-superordinate-of). Structural relations stay creation-only.
- Written like `POST /container/[guid]/relation` (no revision). Its rules now
  live in `authorizeContainerRelationChanges`
  (`app/src/lib/server/containerRelations.ts`), used by the route (unchanged
  behaviour) and the tools. Update permission on either container suffices.
- MCP is stricter than the route: same organization, MCP payload types, no
  templates, no self relations, explicit errors instead of silent drops.
- Symmetric: consistent, inconsistent, equivalent (either direction matches).
- Idempotent add/remove (`changed: false`, no write, no audit). Removal only
  touches existing relations (no stray tombstones).
- Audit: `container_guid` = subject, `related_container_guid` = object,
  `predicate`, `revision` null. Written in the same transaction via
  `changeManyContainerRelations(..., { afterChange })`, indexing after commit.
- Verified per commit: 0 type errors, non-DB tests 188 → 218, all tools
  registered, `npm run lint` clean. Migration dry-run (up + down) inside a
  rolled-back transaction on the dev DB. **Not run:** `db.test.ts` (new
  `changeManyContainerRelations` test) and `mcp/relations.database.test.ts`;
  they need the new migration applied first.

## Agent feedback (2026-09-28, branch `feature/mcp-agent-feedback`)

An agent built a program with ~53 objects from a PDF and reported gaps.
Done on this branch: items 1 (Markdown), 3 (category validation +
documentation), 4 (hierarchy level), 5 (positions), 11 (revision wording).
Facts found: `description`/`body` are Markdown (`Viewer.svelte`, remark-gfm);
parent and child category values are independent checkboxes in the web UI
(`MultipleChoiceDisclosureOption.svelte`); the web sets sub-measure level =
parent + 1 (`EditableMeasureCollection.svelte:69`).

Still open:
- Compact `update_container` response (guid, revision, changed fields).
- Semantic relations directly in `create_container` (saves one call per
  relation).
- Programs have no description by design; their text belongs in chapters or
  sections, which MCP cannot create for programs. Needs a decision.
- Category values like `Mobilit-t` look machine-generated from labels; check
  where values are created (category editor, import) before cleaning up.
- Positions for parallel creates under one parent are computed without a lock
  (duplicates possible, harmless for sorting).

## Review findings (2026-09-29), fixed in place

- P1 revision race: `updateContainer(..., { expectedRevision })` locks the
  current revision (`SELECT … FOR UPDATE`) and throws
  `ContainerRevisionConflictError`; `update_container` passes it. The
  handoff's earlier "remaining gap" is closed for MCP; the web revision route
  could pass `If-Match` the same way (follow-up).
- P1 scope: `create_container` takes the unit from the structural parents
  (omitted → parents' unit, different → rejected, parents of different units
  → rejected). MCP-only; `createAuthorizedContainer` still compares only the
  organization.
- P2 parent types: `is-part-of-program` → program, `is-part-of-measure` →
  measure/simple measure (as the copy service), `is-part-of`: goal→goal;
  measure, simple measure, task → goal or measure; knowledge→knowledge.
- P2 label: "Allow creating and changing content", hint names changes (update
  branch) and relations (relation branch), both languages.

## Next steps

1. Apply the migration (`docker compose run --rm migrate up`) and run the DB
   tests on `feature/mcp-relation-tools`.
2. Push discovery and open PR 1 (base `main`), then PRs 2–5 stacked.
3. Delete `feature/mcp-read-tools` and `feature/mcp-tokens`.

Open follow-ups (optional, separate PRs):
- `/container/[guid]/relation` enqueues indexing inside its transaction,
  i.e. before commit; switch it to `changeManyContainerRelations`.
- Structural moves (`is-part-of*`) as a separate, carefully scoped tool.
- `get_container` exposes relation GUIDs of containers the user may not read.
- Revision lock for both paths: add `expectedRevision` to `updateContainer`'s
  options (`SELECT revision … FOR UPDATE` inside the transaction, conflict
  error on mismatch). Use it from the revision route (today it checks
  `If-Match` before the transaction without a lock) and from
  `update_container`; this closes the remaining gap described above.
- When only the guid differs, the revision route's 422 uses
  `parseResult.error`, which is `undefined` then; give it a proper message.
- Token authentication in the hooks can be revisited later (sketch was:
  sub-requests only, route + method → scope allowlist, default deny, token
  preferred over session with `locals.session = null`).

## Conventions (see `AGENTS.md`)

- Commit messages per cbea.ms; new commits over amending pushed ones unless
  Niels says otherwise; commit/push only when asked.
- Slonik `sql` tag only; Zod for validation; i18n for both `de` and `en`.
- `vi.mock` factories aren't type-checked against real modules — grep them on
  type-shape refactors.
