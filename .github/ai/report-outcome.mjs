#!/usr/bin/env node
// Turns the agent's .ai-task/outcome.json into the message that goes back into
// the chat thread.
//
// Whether a ticket is filed and what is reported follows from that file alone —
// nothing here interprets the agent's prose, so a missing or malformed file
// counts as "the agent did not finish", not as a silent success.

import { readFileSync, writeFileSync } from 'node:fs';
import { composeChatResult, parseOutcome } from './lib.mjs';

const TASK_DIR = '.ai-task';

function readOutcomeFile() {
	try {
		return readFileSync(`${TASK_DIR}/outcome.json`, 'utf8');
	} catch {
		return undefined;
	}
}

const agentSucceeded = process.env.AGENT_OUTCOME === 'success';
const runUrl = process.env.RUN_URL ?? '';
const ticketUrl = process.env.TICKET_URL ?? '';
const ticketFailed = process.env.TICKET_OUTCOME === 'failure';

const { outcome, warnings } = parseOutcome(readOutcomeFile());
for (const warning of warnings) {
	console.log(`::warning::${warning}`);
}

writeFileSync(
	`${TASK_DIR}/chat-result.md`,
	composeChatResult({ agentSucceeded, outcome, runUrl, ticketFailed, ticketUrl })
);
