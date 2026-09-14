#!/usr/bin/env node
// Files a bugfix ticket in knot-dots for a defect the agent reproduced.
//
// Runs at the end of the AI bugfix workflow and decides nothing on its own: it
// files a ticket exactly when .ai-task/outcome.json says the defect was
// reproduced. There is no HTTP endpoint for changing a container, so the ticket
// is written once, with the result — pull request or not — already in it.
//
// Authenticates as the knot-dots-agent machine account, which the application
// accepts through the bearer token path in src/lib/server/machineAuth.ts.

import { appendFileSync, readFileSync } from 'node:fs';
import { buildTicketBody, readConfig, ticketUrl } from './bugfix-ticket.mjs';

const TASK_DIR = '.ai-task';

function readJson(path, fallback) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		return fallback;
	}
}

async function accessToken(config) {
	const response = await fetch(
		`${config.keycloakUrl}/realms/${config.realm}/protocol/openid-connect/token`,
		{
			body: new URLSearchParams([['grant_type', 'client_credentials']]),
			headers: {
				Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
			},
			method: 'POST'
		}
	);
	if (!response.ok) {
		throw new Error(`Could not obtain a token. Keycloak responded with ${response.status}.`);
	}
	const { access_token: token } = await response.json();
	if (!token) {
		throw new Error('Keycloak returned no access token.');
	}
	return token;
}

async function createTicket(config, body, token) {
	const response = await fetch(`${config.baseUrl}/container`, {
		body: JSON.stringify(body),
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		method: 'POST'
	});
	if (response.status !== 201) {
		throw new Error(
			`Could not create the ticket. ${config.baseUrl} responded with ${response.status}: ` +
				`${await response.text()}`
		);
	}
	const { guid } = await response.json();
	if (!guid) {
		throw new Error('The created container came back without a guid.');
	}
	return guid;
}

const outcome = readJson(`${TASK_DIR}/outcome.json`, undefined);
if (outcome?.reproduced !== true) {
	console.log('No ticket: the defect was not reproduced.');
	process.exit(0);
}

const config = readConfig(process.env);
const body = buildTicketBody(outcome, readJson(`${TASK_DIR}/task.json`, {}), config);
const guid = await createTicket(config, body, await accessToken(config));
const url = ticketUrl(config.baseUrl, guid);

console.log(url);
if (process.env.GITHUB_OUTPUT) {
	appendFileSync(process.env.GITHUB_OUTPUT, `ticket_url=${url}\n`);
}
