#!/usr/bin/env node
// Normalises the two ways this workflow can be triggered — a repository
// dispatch from the Google Chat bridge and a manual workflow dispatch — into
// the files the rest of the job reads.
//
// The bug report is text written by someone in a chat space. It reaches the
// agent only as a file, never as a shell argument and never as part of a
// workflow expression, so that neither the shell nor GitHub's expression
// syntax ever parses it.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parsePayload, prepareTask } from './lib.mjs';

const TASK_DIR = '.ai-task';

function setOutput(name, value) {
	if (!process.env.GITHUB_OUTPUT) {
		console.log(`${name}=${value}`);
		return;
	}
	appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

let prepared;
try {
	prepared = prepareTask({
		inputReport: process.env.INPUT_REPORT,
		inputThread: process.env.INPUT_THREAD,
		payload: parsePayload(process.env.CLIENT_PAYLOAD),
		runUrl: process.env.RUN_URL ?? ''
	});
} catch (error) {
	console.log(`::error::${error.message}`);
	process.exit(1);
}

for (const warning of prepared.warnings) {
	console.log(`::warning::${warning}`);
}

mkdirSync(TASK_DIR, { recursive: true });
writeFileSync(`${TASK_DIR}/report.md`, `${prepared.report}\n`);
writeFileSync(`${TASK_DIR}/task.json`, `${JSON.stringify(prepared.task, null, '\t')}\n`);
writeFileSync(
	// The bridge has already acknowledged the request; this only adds the link
	// the reporter needs to follow along.
	`${TASK_DIR}/chat-start.md`,
	`Analyse läuft: ${prepared.task.runUrl}\n`
);

setOutput('has_thread', prepared.task.thread ? 'true' : 'false');
setOutput('space', prepared.task.space);
setOutput('thread', prepared.task.thread);

console.log(`Prepared ${TASK_DIR}/report.md (${prepared.report.length} characters).`);
