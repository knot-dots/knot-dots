import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTicketBody, describeTicket, readConfig, ticketUrl } from './bugfix-ticket.mjs';

const ORGANIZATION = '11111111-1111-4111-8111-111111111111';
const UNIT = '22222222-2222-4222-8222-222222222222';
const PARENT = '33333333-3333-4333-8333-333333333333';

const ENV = {
	KNOTDOTS_AGENT_CLIENT_ID: 'knot-dots-agent',
	KNOTDOTS_AGENT_CLIENT_SECRET: 'secret',
	KNOTDOTS_BASE_URL: 'http://localhost:3000',
	KNOTDOTS_ORGANIZATION: ORGANIZATION,
	PUBLIC_KC_REALM: 'knot-dots',
	PUBLIC_KC_URL: 'http://keycloak:8080'
};

const OUTCOME = {
	notes: 'Der Cache als Ursache ist ausgeschlossen.',
	reproduced: true,
	summary: 'Das Startdatum fiel beim Speichern aus dem Payload.',
	title: 'Startdatum verschwindet beim Speichern'
};

const TASK = {
	requester: 'dev@knotdots.de',
	runUrl: 'https://github.com/knot-dots/knot-dots/actions/runs/7',
	thread: 'spaces/AAQA1b2c/threads/xY9'
};

describe('readConfig', () => {
	it('reads a complete environment', () => {
		const config = readConfig(ENV);
		assert.equal(config.organization, ORGANIZATION);
		assert.equal(config.baseUrl, 'http://localhost:3000');
		assert.equal(config.organizationalUnit, undefined);
		assert.equal(config.parent, undefined);
	});

	it('trims trailing slashes off the urls', () => {
		const config = readConfig({ ...ENV, KNOTDOTS_BASE_URL: 'https://app.knotdots.de/' });
		assert.equal(config.baseUrl, 'https://app.knotdots.de');
	});

	it('names every missing variable at once', () => {
		assert.throws(
			() => readConfig({ KNOTDOTS_BASE_URL: 'http://localhost:3000' }),
			(error) => {
				assert.match(error.message, /KNOTDOTS_ORGANIZATION is not set/);
				assert.match(error.message, /KNOTDOTS_AGENT_CLIENT_SECRET is not set/);
				assert.match(error.message, /PUBLIC_KC_URL is not set/);
				return true;
			}
		);
	});

	it('rejects an identifier that is not a UUID', () => {
		assert.throws(
			() => readConfig({ ...ENV, KNOTDOTS_TICKET_PARENT: 'the-dev-measure' }),
			/parent is not a UUID/
		);
	});
});

describe('buildTicketBody', () => {
	it('files a bugfix task in the configured organization', () => {
		const body = buildTicketBody(OUTCOME, TASK, readConfig(ENV));

		assert.equal(body.organization, ORGANIZATION);
		assert.equal(body.organizational_unit, null);
		assert.equal(body.managed_by, ORGANIZATION);
		assert.equal(body.realm, 'knot-dots');
		assert.equal(body.payload.type, 'task');
		assert.equal(body.payload.taskCategory, 'task_category.bugfix');
		assert.equal(body.payload.status, 'status.idea');
		assert.equal(body.payload.title, OUTCOME.title);
		assert.deepEqual(body.relation, []);
	});

	it('lets an organizational unit take over as managed_by, as the app does', () => {
		const config = readConfig({ ...ENV, KNOTDOTS_ORGANIZATIONAL_UNIT: UNIT });
		const body = buildTicketBody(OUTCOME, TASK, config);

		assert.equal(body.organizational_unit, UNIT);
		assert.equal(body.managed_by, UNIT);
		assert.equal(body.organization, ORGANIZATION);
	});

	it('hangs the ticket under the configured parent, leaving the subject to the server', () => {
		const config = readConfig({ ...ENV, KNOTDOTS_TICKET_PARENT: PARENT });
		const body = buildTicketBody(OUTCOME, TASK, config);

		assert.deepEqual(body.relation, [{ object: PARENT, position: 0, predicate: 'is-part-of' }]);
		assert.ok(!('subject' in body.relation[0]));
	});

	it('refuses to file a ticket without a title', () => {
		const { title, ...untitled } = OUTCOME;
		assert.throws(() => buildTicketBody(untitled, TASK, readConfig(ENV)), /names no title/);
	});
});

describe('describeTicket', () => {
	it('carries the write-up, the findings and where it came from', () => {
		const description = describeTicket(OUTCOME, TASK);

		assert.match(description, /Das Startdatum fiel beim Speichern aus dem Payload\./);
		assert.match(description, /Der Cache als Ursache ist ausgeschlossen\./);
		assert.match(description, /spaces\/AAQA1b2c\/threads\/xY9/);
		assert.match(description, /dev@knotdots\.de/);
		assert.match(description, /Lauf: /);
		assert.match(description, /Angelegt vom Untersuchungs-Agenten\./);
	});

	it('stays readable when the agent left almost nothing behind', () => {
		assert.match(describeTicket({ reproduced: true }, {}), /Angelegt vom Untersuchungs-Agenten\./);
	});
});

describe('ticketUrl', () => {
	it('points at the container route', () => {
		assert.equal(
			ticketUrl('https://app.knotdots.de', PARENT),
			`https://app.knotdots.de/${PARENT}`
		);
		assert.equal(ticketUrl('https://app.knotdots.de/', PARENT), `https://app.knotdots.de/${PARENT}`);
	});
});
