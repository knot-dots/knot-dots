import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	composeChatResult,
	deservesTicket,
	normaliseThread,
	parseOutcome,
	parsePayload,
	prepareTask,
	REPORT_LIMIT
} from './lib.mjs';

const THREAD = 'spaces/AAQA1b2c/threads/xY-9_z';

describe('parsePayload', () => {
	it('treats the absent dispatch payload as empty', () => {
		assert.deepEqual(parsePayload(undefined), {});
		assert.deepEqual(parsePayload(''), {});
		assert.deepEqual(parsePayload('null'), {});
	});

	it('rejects malformed JSON loudly', () => {
		assert.throws(() => parsePayload('{'), SyntaxError);
	});
});

describe('normaliseThread', () => {
	it('derives the space from a well-formed thread', () => {
		assert.deepEqual(normaliseThread(THREAD), {
			space: 'spaces/AAQA1b2c',
			thread: THREAD,
			warnings: []
		});
	});

	it('drops a thread of the wrong shape and says so', () => {
		const result = normaliseThread('spaces/AAQA1b2c');
		assert.equal(result.thread, undefined);
		assert.equal(result.warnings.length, 1);
	});

	it('drops a thread carrying a shell metacharacter', () => {
		assert.equal(normaliseThread('spaces/a/threads/b;rm -rf /').thread, undefined);
	});

	it('stays quiet when no thread was given at all', () => {
		assert.deepEqual(normaliseThread(''), { warnings: [] });
	});
});

describe('prepareTask', () => {
	const base = { inputReport: undefined, inputThread: undefined, runUrl: 'http://run' };

	it('reads a report from the dispatch payload', () => {
		const prepared = prepareTask({
			...base,
			payload: { report: '  Die Karte bleibt leer  ', requester: 'a@example.org', thread: THREAD }
		});
		assert.equal(prepared.report, 'Die Karte bleibt leer');
		assert.deepEqual(prepared.task, {
			requester: 'a@example.org',
			runUrl: 'http://run',
			space: 'spaces/AAQA1b2c',
			thread: THREAD
		});
		assert.deepEqual(prepared.warnings, []);
	});

	it('reads a report from the manual inputs', () => {
		const prepared = prepareTask({ ...base, inputReport: 'Kaputt', payload: {} });
		assert.equal(prepared.report, 'Kaputt');
		assert.equal(prepared.task.thread, '');
	});

	it('refuses a request without a report', () => {
		assert.throws(() => prepareTask({ ...base, payload: { thread: THREAD } }), /no bug report/);
		assert.throws(() => prepareTask({ ...base, inputReport: '   ', payload: {} }), /no bug report/);
	});

	it('truncates an oversized report and says so', () => {
		const prepared = prepareTask({ ...base, payload: { report: 'x'.repeat(REPORT_LIMIT + 100) } });
		assert.equal(prepared.report.length, REPORT_LIMIT);
		assert.equal(prepared.warnings.length, 1);
	});
});

describe('parseOutcome', () => {
	it('accepts a well-formed outcome', () => {
		const { outcome, warnings } = parseOutcome('{"reproduced": true, "title": "t"}');
		assert.equal(outcome.reproduced, true);
		assert.deepEqual(warnings, []);
	});

	it('reports a missing file instead of guessing', () => {
		const { outcome, warnings } = parseOutcome(undefined);
		assert.equal(outcome, undefined);
		assert.match(warnings[0], /missing/);
	});

	it('reports malformed JSON', () => {
		assert.match(parseOutcome('{').warnings[0], /not valid JSON/);
	});

	it('insists on a boolean reproduced field', () => {
		assert.match(parseOutcome('{"reproduced": "yes"}').warnings[0], /boolean/);
		assert.match(parseOutcome('{"title": "t"}').warnings[0], /boolean/);
	});
});

describe('deservesTicket', () => {
	it('grants a ticket only for a reproduced defect from a finished run', () => {
		assert.equal(deservesTicket({ reproduced: true }, true), true);
		assert.equal(deservesTicket({ reproduced: false }, true), false);
		assert.equal(deservesTicket({ reproduced: true }, false), false);
		assert.equal(deservesTicket(undefined, true), false);
	});
});

describe('composeChatResult', () => {
	const runUrl = 'http://run/1';

	it('links the ticket and carries the write-up', () => {
		const message = composeChatResult({
			agentSucceeded: true,
			outcome: { reproduced: true, summary: 'Zod-Schema war zu streng.' },
			runUrl,
			ticketUrl: 'http://knotdots/t/1'
		});
		assert.match(message, /Reproduziert und untersucht/);
		assert.match(message, /Ticket: http:\/\/knotdots\/t\/1/);
		assert.match(message, /Zod-Schema war zu streng\./);
	});

	it('says so when the ticket could not be filed', () => {
		const message = composeChatResult({
			agentSucceeded: true,
			outcome: { reproduced: true },
			runUrl,
			ticketFailed: true
		});
		assert.match(message, /Ticket konnte ich nicht anlegen/);
	});

	it('says the run broke off rather than claiming a result', () => {
		const message = composeChatResult({
			agentSucceeded: false,
			outcome: { reproduced: true },
			runUrl
		});
		assert.match(message, /abgebrochen/);
	});

	it('explains an unreproducible report and promises nothing', () => {
		const message = composeChatResult({
			agentSucceeded: true,
			outcome: { notes: 'Karte lädt in allen drei Browsern.', reproduced: false },
			runUrl
		});
		assert.match(message, /nicht reproduzieren/);
		assert.match(message, /kein Ticket/);
		assert.match(message, /Karte lädt in allen drei Browsern\./);
		assert.doesNotMatch(message, /Ticket:/);
	});

	it('falls back to the run link when there is no outcome at all', () => {
		const message = composeChatResult({ agentSucceeded: false, outcome: undefined, runUrl });
		assert.match(message, /kein Ergebnis/);
		assert.match(message, /http:\/\/run\/1/);
	});
});
