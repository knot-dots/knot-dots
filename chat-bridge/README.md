# Google Chat bridge

The Chat side of the bug investigation agent. It listens in the bug reporting channel,
and when someone mentions it — „@claude, kannst Du diesen Fehler beheben" — it starts the
[AI bug investigation workflow](../.github/workflows/ai-bug-investigation.yaml) and
acknowledges in the thread. The workflow itself reports the result back.

A Chat app receives an event **only when it is mentioned** in a space, which is exactly
the trigger we want. Everything the bridge decides lives in `src/lib.js` and is covered by
`lib.test.mjs`; `src/Code.js` holds only the Apps Script glue, because Chat expects a
reply within 30 seconds and there is nowhere to defer work to.

## Setup

### 1. Allow clasp to reach Apps Script

Turn the Apps Script API on for the Google account that will own the project, at
<https://script.google.com/home/usersettings>. Without it every clasp command fails with
"User has not enabled the Apps Script API", which reads like a credential problem and is
not one.

Then log in as a normal Workspace user — your own account is fine, and it is the only
option that works: the Apps Script API does not accept Google Cloud service accounts, and
a service account cannot own a script. There is no need to install clasp; pin it through
npx instead:

```bash
npx @google/clasp@3 login
```

The consent screen lets you pick scopes, and the granted token then sits in plain text in
`~/.clasprc.json`. Only four of them are needed here: creating and updating Apps Script
**projects** and **deployments**, plus the two Drive scopes. Decline "Google Cloud data",
"API service configuration", "log data" and "publish as a web app" — clasp wants those for
`enable-api`, `logs` and versioned web app deployments, none of which this bridge uses. If
a command ever stops with "insufficient authentication scopes", log in again and add the
missing one; the error names the problem clearly enough that the sparse grant is worth it.

**Where the project lives matters more than who logs in.** A script in someone's My Drive
belongs to that person, and a common way for such a project to die is its owner leaving.
Files in a shared drive have no individual owner, so create a shared drive for it and move
the script file there right after `create-script`. Versioned deployments are the reason to
do this from the start rather than later: their ownership cannot be transferred at all, and
they break when their creator's account is deleted. The head deployment this bridge uses is
not affected, but moving a project after the fact means a new script and a new deployment id
to paste into the Chat configuration.

### 2. Push the code

From the `chat-bridge` directory:

```bash
npx @google/clasp@3 create-script --type standalone --title claude --rootDir src
git checkout src/appsscript.json   # create-script overwrites the manifest with a default
npx @google/clasp@3 push --force   # --force: the manifest differs from the remote one
```

`create-script` writes `.clasp.json` itself. It is git-ignored, because the script id
belongs to an installation rather than to the source; `.clasp.json.example` records the
shape. `rootDir` must stay `src` so that only the deployed files are pushed — the tests
and this README are not part of the Apps Script project.

For an existing project use `npx @google/clasp@3 clone <script id> --rootDir src` instead.

### 3. Take the deployment id

```bash
npx @google/clasp@3 list-deployments
```

The entry marked `@HEAD` is the one the Chat configuration wants. In the editor it is under
**Deploy → Test deployments → Head deployment ID**.

### 4. Configure the Chat app

In a Google Cloud project, enable the **Google Chat API**, then open its
**Configuration** page:

- **App name: `claude`.** The display name is what `@claude` resolves to, so this is not
  cosmetic.
- Avatar URL and description: whatever you like.
- Functionality: **Join spaces and group conversations**.
- Connection settings: **Apps Script project**, and paste the Head deployment ID.
- Visibility: the developers who may use it.

Then add the app to the bug reporting channel.

Associating the Apps Script project with the Cloud project is not needed for this path:
the connection runs through the head deployment, and the bridge calls no Google API, only
GitHub. Two later steps do require the association — a *versioned* add-on deployment, and
reading thread history (see the last section).

### 5. Script properties

**Apps Script editor → Project Settings → Script properties.**

| Property               | Required | Meaning                                                     |
| ---------------------- | -------- | ----------------------------------------------------------- |
| `GITHUB_TOKEN`         | yes      | token that may start a repository dispatch                  |
| `ALLOWED_SPACES`       | yes      | space names allowed to trigger runs, e.g. `spaces/AAQA1b2c` |
| `ALLOWED_SENDERS`      | yes      | e-mail addresses allowed to trigger runs                    |
| `GITHUB_REPOSITORY`    | no       | defaults to `knot-dots/knot-dots`                           |
| `DISPATCH_EVENT_TYPE`  | no       | defaults to `chat-bugfix`                                   |

Both allowlists accept a comma or whitespace separated list, and **both must be set**: the
bridge fails closed, so a half-finished setup dispatches nothing rather than handing the
repository to a whole domain.

To find the space name, mention the app once before filling in `ALLOWED_SPACES`. It will
refuse, and the Apps Script execution log names the space and the sender it saw.

### 6. About the GitHub token

Starting a repository dispatch is not a read-only operation: GitHub documents the classic
`repo` scope for it, and a fine-grained token needs write access to repository contents.
There is no narrower permission that covers only dispatching, so the token the bridge
holds is more powerful than the bridge's job. Contain it instead:

- a fine-grained token scoped to `knot-dots/knot-dots` alone, issued by a machine account,
- `main` protected and review required, so the agent's branch and draft pull request
  cannot become a merge on their own,
- the allowlists above, which stop a token leak from being triggerable through the bridge.

## Tests

```bash
node --test chat-bridge/lib.test.mjs
```

The tests evaluate `src/lib.js` in a `node:vm` context, which reproduces the single global
scope of the Apps Script runtime. The file under test is therefore exactly the file that
gets deployed — there is no build step and no second copy of the logic.

## What it does not do yet

The bridge currently sends only the text of the mention itself. Reading the rest of the
thread — the original bug report and the discussion under it — needs
`spaces.messages.list` with app authentication, which means a service account and a
one-time Google Workspace administrator approval of the `chat.app.messages.readonly`
scope. `buildTranscript` already takes a list of messages, so that step is a change in
`Code.js` and the manifest, not in the logic.
