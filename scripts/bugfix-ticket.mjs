// Builds the knot-dots ticket for a reproduced defect.
//
// Kept free of I/O so that scripts/bugfix-ticket.test.mjs can check the shape
// of the request against what the application expects; create-bugfix-ticket.mjs
// does the talking.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUIRED = {
	KNOTDOTS_AGENT_CLIENT_ID: 'clientId',
	KNOTDOTS_AGENT_CLIENT_SECRET: 'clientSecret',
	KNOTDOTS_BASE_URL: 'baseUrl',
	KNOTDOTS_ORGANIZATION: 'organization',
	PUBLIC_KC_REALM: 'realm',
	PUBLIC_KC_URL: 'keycloakUrl'
};

const OPTIONAL_UUIDS = {
	KNOTDOTS_ORGANIZATIONAL_UNIT: 'organizationalUnit',
	KNOTDOTS_TICKET_PARENT: 'parent'
};

/**
 * Reads the configuration out of the environment, naming everything that is
 * missing or malformed at once rather than failing on the first hole.
 */
export function readConfig(env) {
	const config = {};
	const problems = [];

	for (const [variable, key] of Object.entries(REQUIRED)) {
		const value = String(env[variable] ?? '').trim();
		if (!value) {
			problems.push(`${variable} is not set`);
			continue;
		}
		config[key] = variable.endsWith('_URL') ? value.replace(/\/+$/, '') : value;
	}
	for (const [variable, key] of Object.entries(OPTIONAL_UUIDS)) {
		const value = String(env[variable] ?? '').trim();
		config[key] = value || undefined;
	}

	for (const key of ['organization', 'organizationalUnit', 'parent']) {
		if (config[key] && !UUID.test(config[key])) {
			problems.push(`${key} is not a UUID: ${config[key]}`);
		}
	}

	if (problems.length) {
		throw new Error(`Cannot file a ticket: ${problems.join(', ')}.`);
	}
	return config;
}

/** The markdown body of the ticket. */
export function describeTicket(outcome, task) {
	const lines = [];
	if (outcome.summary) {
		lines.push(outcome.summary, '');
	}
	if (task.thread) {
		lines.push(`Gemeldet in: ${task.thread}`);
	}
	if (task.requester) {
		lines.push(`Beauftragt von: ${task.requester}`);
	}
	if (task.runUrl) {
		lines.push(`Lauf: ${task.runUrl}`);
	}
	if (outcome.notes) {
		lines.push('', outcome.notes);
	}
	lines.push('', 'Angelegt vom Untersuchungs-Agenten.');
	return lines.join('\n');
}

/**
 * Assembles the request body for POST /container.
 *
 * managed_by is what the authorization rules match a create against, and it is
 * the organizational unit when there is one, exactly as the application itself
 * does it in containerOfType.
 */
export function buildTicketBody(outcome, task, config) {
	if (!outcome.title) {
		throw new Error('Cannot file a ticket: the outcome names no title.');
	}

	return {
		managed_by: config.organizationalUnit ?? config.organization,
		organization: config.organization,
		organizational_unit: config.organizationalUnit ?? null,
		payload: {
			description: describeTicket(outcome, task),
			status: 'status.idea',
			taskCategory: 'task_category.bugfix',
			title: outcome.title,
			type: 'task'
		},
		realm: config.realm,
		// The new container is the subject of the relation, and it has no guid
		// yet — the server fills the subject in.
		relation: config.parent
			? [{ object: config.parent, position: 0, predicate: 'is-part-of' }]
			: []
	};
}

export function ticketUrl(baseUrl, guid) {
	return `${baseUrl.replace(/\/+$/, '')}/${guid}`;
}
