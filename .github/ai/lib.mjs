// Pure helpers for the AI bug investigation workflow. Everything here is free
// of I/O so that it can be exercised by .github/ai/lib.test.mjs; the entry
// scripts prepare-task.mjs and report-outcome.mjs do the reading, writing and
// logging.

// A chat thread is only ever used to address a reply, so it has to match the
// documented shape exactly.
const THREAD_PATTERN = /^spaces\/[A-Za-z0-9_-]+\/threads\/[A-Za-z0-9_-]+$/;

export const REPORT_LIMIT = 30000;

export function parsePayload(raw) {
	if (!raw || raw === 'null') {
		return {};
	}
	const parsed = JSON.parse(raw);
	return parsed && typeof parsed === 'object' ? parsed : {};
}

export function normaliseThread(candidate) {
	const thread = String(candidate ?? '').trim();
	if (!thread) {
		return { warnings: [] };
	}
	if (!THREAD_PATTERN.test(thread)) {
		return {
			warnings: ['The chat thread does not have the shape spaces/…/threads/… and is ignored.']
		};
	}
	return { space: thread.split('/').slice(0, 2).join('/'), thread, warnings: [] };
}

export function prepareTask({ inputReport, inputThread, payload, runUrl }) {
	const report = String(payload.report ?? inputReport ?? '').trim();
	if (!report) {
		throw new Error('The request carries no bug report.');
	}

	const { space, thread, warnings } = normaliseThread(payload.thread ?? inputThread);
	if (report.length > REPORT_LIMIT) {
		warnings.push(`The bug report exceeds ${REPORT_LIMIT} characters and is truncated.`);
	}

	return {
		report: report.slice(0, REPORT_LIMIT),
		task: {
			requester: String(payload.requester ?? '').trim(),
			runUrl,
			space: space ?? '',
			thread: thread ?? ''
		},
		warnings
	};
}

export function parseOutcome(raw) {
	if (raw === undefined) {
		return { warnings: ['.ai-task/outcome.json is missing.'] };
	}
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { warnings: ['.ai-task/outcome.json is not valid JSON.'] };
	}
	if (typeof parsed?.reproduced !== 'boolean') {
		return { warnings: ['.ai-task/outcome.json has no boolean "reproduced" field.'] };
	}
	return { outcome: parsed, warnings: [] };
}

function text(value) {
	return typeof value === 'string' ? value.trim() : '';
}

// Only a reproduced defect earns a ticket. An unreproducible report is not
// evidence of a bug, and a run that ended in failure is not evidence of
// anything — its outcome file may describe work that was never finished.
export function deservesTicket(outcome, agentSucceeded) {
	return outcome?.reproduced === true && agentSucceeded;
}

export function composeChatResult({ agentSucceeded, outcome, runUrl, ticketFailed, ticketUrl }) {
	if (!outcome) {
		return (
			'Ich bin bei diesem Fehler nicht durchgekommen — der Lauf hat kein Ergebnis ' +
			`hinterlassen. Log und Playwright-Report: ${runUrl}\n`
		);
	}

	const summary = text(outcome.summary);
	const notes = text(outcome.notes);

	if (!outcome.reproduced) {
		const explanation = summary || notes || 'Keine weitere Begründung hinterlassen.';
		return (
			'Ich konnte den Fehler nicht reproduzieren, deshalb habe ich auch kein Ticket ' +
			`angelegt.\n\n${explanation}\n\nLauf: ${runUrl}\n`
		);
	}

	const lines = [];
	if (!agentSucceeded) {
		lines.push('Reproduziert, aber der Lauf ist unterwegs abgebrochen — bitte selbst nachsehen.');
	} else {
		lines.push('Reproduziert und untersucht.');
	}
	if (ticketUrl) {
		lines.push(`Ticket: ${ticketUrl}`);
	} else if (ticketFailed) {
		lines.push('Das Ticket konnte ich nicht anlegen — siehe den Lauf unten.');
	}
	if (summary) {
		lines.push('', summary);
	}
	if (notes) {
		lines.push('', notes);
	}
	lines.push('', `Lauf: ${runUrl}`);
	return `${lines.join('\n')}\n`;
}
