import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createContext, runInContext } from 'node:vm';

// src/lib.js is written for the Apps Script runtime, which has no module
// system and concatenates every file into one global scope. Evaluating it in a
// context reproduces that scope, so the file under test stays exactly the file
// that gets deployed.
const scope = { console };
createContext(scope);
runInContext(readFileSync(new URL('./src/lib.js', import.meta.url), 'utf8'), scope);

const { buildTranscript, dispatchPayload, isAllowed, messagesFromEvent, parseList, threadOf } =
	scope;

// Objects the context returns carry that context's prototypes, which strict
// deep equality compares as well. Round-tripping them brings them back into
// this realm so the assertions can stay strict.
const plain = (value) => JSON.parse(JSON.stringify(value));

const SPACE = 'spaces/AAQA1b2c';
const CONFIG = { allowedSenders: ['dev@knotdots.de'], allowedSpaces: [SPACE] };

function eventFrom(overrides = {}) {
	return {
		message: {
			argumentText: ', kannst Du diesen Fehler beheben',
			createTime: '2026-09-02T10:00:00Z',
			thread: { name: `${SPACE}/threads/xY9` }
		},
		space: { name: SPACE },
		user: { displayName: 'Dev', email: 'dev@knotdots.de' },
		...overrides
	};
}

describe('isAllowed', () => {
	it('accepts a listed sender in a listed space', () => {
		assert.deepEqual(plain(isAllowed(eventFrom(), CONFIG)), { allowed: true });
	});

	it('refuses everything while the allowlists are empty', () => {
		const empty = { allowedSenders: [], allowedSpaces: [] };
		assert.deepEqual(plain(isAllowed(eventFrom(), empty)), {
			allowed: false,
			reason: 'not-configured'
		});
	});

	it('refuses a half-configured bridge as well', () => {
		const half = { allowedSenders: [], allowedSpaces: [SPACE] };
		assert.equal(isAllowed(eventFrom(), half).reason, 'not-configured');
	});

	it('refuses another space', () => {
		const event = eventFrom({ space: { name: 'spaces/somewhere-else' } });
		assert.equal(isAllowed(event, CONFIG).reason, 'space');
	});

	it('refuses an unlisted sender', () => {
		const event = eventFrom({ user: { email: 'stranger@example.org' } });
		assert.equal(isAllowed(event, CONFIG).reason, 'sender');
	});

	it('refuses an event without a sender or space', () => {
		assert.equal(isAllowed({}, CONFIG).allowed, false);
	});
});

describe('parseList', () => {
	it('splits on commas and whitespace and drops the gaps', () => {
		assert.deepEqual(plain(parseList('a@b.de, c@d.de')), ['a@b.de', 'c@d.de']);
		assert.deepEqual(plain(parseList('a@b.de\nc@d.de')), ['a@b.de', 'c@d.de']);
		assert.deepEqual(plain(parseList(' , a@b.de ,, ')), ['a@b.de']);
	});

	it('treats an unset property as an empty list', () => {
		assert.deepEqual(plain(parseList(null)), []);
		assert.deepEqual(plain(parseList('')), []);
	});
});

describe('messagesFromEvent', () => {
	it('prefers the text with the mention already stripped', () => {
		const [message] = messagesFromEvent(eventFrom());
		assert.equal(message.text, ', kannst Du diesen Fehler beheben');
		assert.equal(message.sender, 'Dev');
		assert.equal(message.createTime, '2026-09-02T10:00:00Z');
	});

	it('falls back to the raw text when there is no argument text', () => {
		const event = eventFrom({ message: { text: '@claude alles kaputt' } });
		assert.equal(messagesFromEvent(event)[0].text, '@claude alles kaputt');
	});
});

describe('buildTranscript', () => {
	const message = (text, sender) => ({ createTime: '2026-09-02', sender, text });

	it('formats a single message with its author', () => {
		assert.equal(
			buildTranscript([message('Karte bleibt leer', 'Dev')]),
			'## Dev — 2026-09-02\nKarte bleibt leer'
		);
	});

	it('keeps an empty thread empty', () => {
		assert.equal(buildTranscript([]), '');
	});

	it('joins messages oldest first', () => {
		const transcript = buildTranscript([message('erst', 'A'), message('dann', 'B')]);
		assert.ok(transcript.indexOf('erst') < transcript.indexOf('dann'));
	});

	it('keeps the original report and the newest replies when it has to cut', () => {
		const messages = [
			message('Der ursprüngliche Bugreport', 'A'),
			message('mitte-eins', 'B'),
			message('mitte-zwei', 'C'),
			message('die neueste Antwort', 'D')
		];
		const transcript = buildTranscript(messages, 140);

		assert.ok(transcript.length <= 140);
		assert.match(transcript, /Der ursprüngliche Bugreport/);
		assert.match(transcript, /die neueste Antwort/);
		assert.match(transcript, /ausgelassen/);
		assert.doesNotMatch(transcript, /mitte-eins/);
		assert.doesNotMatch(transcript, /mitte-zwei/);
	});

	it('never exceeds the cap even when the first message alone is too long', () => {
		const transcript = buildTranscript([message('x'.repeat(500), 'A')], 100);
		assert.ok(transcript.length <= 100);
	});
});

describe('dispatchPayload', () => {
	it('stays within the ten top-level keys a dispatch payload allows', () => {
		const payload = dispatchPayload({
			report: 'kaputt',
			requester: 'dev@knotdots.de',
			space: SPACE,
			thread: `${SPACE}/threads/xY9`
		});
		assert.ok(Object.keys(payload).length <= 10);
		assert.deepEqual(plain(Object.keys(payload).sort()), ['report', 'requester', 'space', 'thread']);
	});

	it('sends empty strings rather than undefined for what it does not know', () => {
		assert.deepEqual(plain(dispatchPayload({ report: 'kaputt' })), {
			report: 'kaputt',
			requester: '',
			space: '',
			thread: ''
		});
	});
});

describe('threadOf', () => {
	it('reads the thread the mention happened in', () => {
		assert.equal(threadOf(eventFrom()), `${SPACE}/threads/xY9`);
	});

	it('returns an empty string when there is no thread', () => {
		assert.equal(threadOf({ message: {} }), '');
		assert.equal(threadOf({}), '');
	});
});
