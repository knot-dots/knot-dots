# AI bug investigation

An agent that takes a defect reported in the Google Chat bug channel, reproduces it in a
full application stack, finds out why it happens and files a ticket in knot-dots. It
reports back into the chat thread it was asked in.

It does not change the repository. The job asks for `contents: read`, so the agent reads
the checkout, the history, the database and the running application, and can write
nothing back.

- [`../workflows/ai-bug-investigation.yaml`](../workflows/ai-bug-investigation.yaml) —
  the run: environment, agent, reporting.
- [`investigation-instructions.md`](investigation-instructions.md) — what the agent is
  told to do. This is the file to edit when its behaviour needs to change.
- `prepare-task.mjs` — turns a trigger into `.ai-task/report.md` and `.ai-task/task.json`.
- `report-outcome.mjs` — turns the agent's `.ai-task/outcome.json` into the chat reply.
- `lib.mjs` / `lib.test.mjs` — the logic of both scripts, and its tests.
- `post-chat-message.sh` — posts one message into a chat thread as the Chat app.
- [`../../scripts/create-bugfix-ticket.mjs`](../../scripts/create-bugfix-ticket.mjs) —
  files the ticket, with its logic and tests in `scripts/bugfix-ticket*.mjs`.

The environment mirrors the `test-e2e` job of
[`ci-app.yaml`](../workflows/ci-app.yaml): Docker Compose brings up Postgres, Keycloak,
Elasticsearch, S3Mock and the built application, and Playwright drives a browser against
it. The runner therefore holds only the development credentials that are checked into
this repository.

## What the agent can reach

The agent is driven by text somebody wrote in a chat space, and it runs with
`--dangerously-skip-permissions`. That is a deliberate choice, not an oversight: the
investigation needs `docker compose`, `npm`, `npx` and `psql`, and an allowlist containing
those permits arbitrary commands through `docker compose exec` and `npx` anyway. It would
look like a control without being one.

The containment is the blast radius instead:

- The job asks for `contents: read` and the agent process gets **no** `GH_TOKEN`. It
  cannot push a branch, open a pull request or touch another repository.
- The knot-dots machine credentials and the Google Chat key are set on their own steps,
  never on the agent's, so the agent's process never sees them.
- The runner is ephemeral and holds only the development credentials checked into this
  repository.
- Only the senders and the space listed in the bridge can trigger a run at all.
- `--max-turns` and the job timeout bound a run that goes astray.

What remains inside the agent's reach is `ANTHROPIC_API_KEY`, on a runner with
unrestricted network access. **Use a separate API key for this workflow with a spend limit
on it**, so that both a leak and a runaway run stay bounded.

The instructions tell the agent to treat the report as data and ignore directives inside
it. That reduces accidents; it is not a security boundary, and it is not counted as one
above.

## Setup

### 1. Anthropic credentials

Either `ANTHROPIC_API_KEY` (billed per use) or `CLAUDE_CODE_OAUTH_TOKEN` from a Claude
subscription. The workflow uses the API key; to switch, swap the two lines in the agent
step.

### 2. The knot-dots ticket

The ticket is the deliverable, so this is the part to set up first. A defect the agent
reproduced becomes a task with `taskCategory: task_category.bugfix`. Writing it needs a
machine account, because the application otherwise only accepts browser sessions:
`src/lib/server/machineAuth.ts` accepts an OAuth access token when the token's client is
listed in `MACHINE_CLIENT_IDS`.

On the instance that is written to:

1. A Keycloak client `knot-dots-agent` with service accounts enabled. The development
   realm has it in `keycloak/import/knot-dots.json`, the deployed realms in the
   `keycloak` module of the infrastructure project.
2. The `MachineAuthentication` feature flag on. It is a deployment-level flag, so it comes
   from `strategytool_feature_flags` in the infrastructure project and can be closed again
   with `kubectl annotate` without waiting for a rollout.
3. `MACHINE_CLIENT_IDS=knot-dots-agent` in the application's environment. Flag and
   allowlist are independent on purpose: the flag decides whether the path exists at all,
   the allowlist which identity may use it. Either one missing refuses every bearer token.
4. The service account — it appears as a user the first time it presents a token — needs
   member rights that allow creating content in the target organization or organizational
   unit. `create` is granted for whatever `managed_by` points at, so being a collaborator
   of that organization is enough. Nothing more should be given.

Then configure the workflow. Secrets:

| Secret                         | Value                |
| ------------------------------ | -------------------- |
| `KNOTDOTS_AGENT_CLIENT_ID`     | `knot-dots-agent`    |
| `KNOTDOTS_AGENT_CLIENT_SECRET` | that client's secret |

Repository variables:

| Variable                           | Meaning                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `KNOTDOTS_BASE_URL`                | the instance to write to; it has to be reachable from CI    |
| `KNOTDOTS_ORGANIZATION`            | organization the ticket belongs to                          |
| `KNOTDOTS_ORGANIZATIONAL_UNIT`     | optional; becomes `managed_by` when set                     |
| `KNOTDOTS_TICKET_PARENT`           | optional container the ticket is filed under (`is-part-of`) |
| `PUBLIC_KC_URL`, `PUBLIC_KC_REALM` | the Keycloak that instance trusts                           |

Leave `KNOTDOTS_ORGANIZATION` or the client secret unset and the step skips itself, so the
rest of the run works unchanged. There is no HTTP endpoint for changing a container, so
the ticket is written once, at the end, with the findings already in it.

### 3. Google Chat (optional until the bridge exists)

`GOOGLE_CHAT_SA_KEY` holds the service account key of the Chat app. Without it, and
without a thread to reply to, the workflow skips the two reporting steps and everything
else runs unchanged. See [`../../chat-bridge/README.md`](../../chat-bridge/README.md).

## Triggering a run

Manually, with a free-text report:

```bash
gh workflow run ai-bug-investigation.yaml -f report="$(cat bug.md)"
gh run watch
```

The same shape the Chat bridge uses:

```bash
gh api repos/knot-dots/knot-dots/dispatches \
	--field event_type=chat-bugfix \
	--field 'client_payload[report]=Beim Speichern verschwindet das Startdatum.' \
	--field 'client_payload[thread]=spaces/AAQA1b2c/threads/xY-9_z' \
	--field 'client_payload[requester]=someone@knotdots.de'
```

A dispatch payload may hold at most 10 top-level keys and 64 KB in total, so the bridge
truncates long threads before sending them. A repository dispatch only starts a workflow
that exists on the default branch.

## What comes out

The agent's last action is `.ai-task/outcome.json`, and the workflow reads that file and
nothing else. A reproduced defect earns a ticket; a report that could not be reproduced
earns an explanation in the thread and nothing more. A run that broke off says so instead
of claiming either.

Whatever the agent produced while investigating lands in the run artifact together with
the Playwright report, so a scratch reproduction script survives without ever entering the
repository.

## Tests

```bash
node --test .github/ai/lib.test.mjs chat-bridge/lib.test.mjs scripts/bugfix-ticket.test.mjs
npm run test:unit --workspace app -- run src/lib/server/machineAuth.test.ts
```

The files have to be named explicitly: the test runner skips dot-directories such as
`.github` when it discovers tests on its own.

To check the ticket path against a local stack, give the machine account a membership as
described above and run `scripts/create-bugfix-ticket.mjs` with `KNOTDOTS_BASE_URL` set to
`http://localhost:5173` and an `.ai-task/outcome.json` that says `"reproduced": true`.
