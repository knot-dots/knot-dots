// Pure helpers for the Google Chat bridge.
//
// Apps Script concatenates every file of a project into one global scope, so
// these functions are simply available to Code.js — there is no import. They
// are kept free of Apps Script APIs so that lib.test.mjs can evaluate this
// file and exercise them under plain Node.

// A repository dispatch payload may hold at most 10 top-level keys and 64 KB in
// total. Staying well below that leaves room for the JSON overhead and for
// characters that grow when encoded.
var TRANSCRIPT_LIMIT = 30000;

// Room set aside for the "messages omitted" marker and its separators.
var MARKER_RESERVE = 48;

/**
 * Decides whether a chat message may start an agent run.
 *
 * Fails closed: a bridge without configured allowlists dispatches nothing, so
 * a half-finished setup cannot hand the repository to a whole domain.
 */
function isAllowed(event, config) {
	var space = event && event.space && event.space.name;
	var sender = event && event.user && event.user.email;

	if (!config.allowedSpaces.length || !config.allowedSenders.length) {
		return { allowed: false, reason: 'not-configured' };
	}
	if (config.allowedSpaces.indexOf(space) === -1) {
		return { allowed: false, reason: 'space' };
	}
	if (config.allowedSenders.indexOf(sender) === -1) {
		return { allowed: false, reason: 'sender' };
	}
	return { allowed: true };
}

/** Splits a comma or whitespace separated script property into a list. */
function parseList(value) {
	if (!value) {
		return [];
	}
	return String(value)
		.split(/[,\s]+/)
		.map(function (entry) {
			return entry.trim();
		})
		.filter(function (entry) {
			return entry.length > 0;
		});
}

/**
 * Formats chat messages into the report the agent reads.
 *
 * When the thread does not fit, the oldest message is kept whole — it is the
 * original bug report — and messages are dropped from the middle, with a
 * marker so that the agent knows something is missing.
 */
function buildTranscript(messages, limit) {
	var cap = limit || TRANSCRIPT_LIMIT;
	var blocks = messages.map(formatMessage);

	if (blocks.length === 0) {
		return '';
	}

	var joined = blocks.join('\n\n');
	if (joined.length <= cap) {
		return joined;
	}

	// The marker has to be paid for out of the budget as well, otherwise the
	// final slice would amputate the newest message — the one we just promised
	// to keep.
	var budget = cap - blocks[0].length - MARKER_RESERVE;
	var tail = [];
	var used = 0;
	for (var i = blocks.length - 1; i > 0; i--) {
		var next = used + blocks[i].length + 2;
		if (next > budget) {
			break;
		}
		tail.unshift(blocks[i]);
		used = next;
	}

	var parts = [blocks[0]];
	var dropped = blocks.length - 1 - tail.length;
	if (dropped > 0) {
		parts.push('[… ' + dropped + ' Nachricht(en) ausgelassen …]');
	}
	return parts.concat(tail).join('\n\n').slice(0, cap);
}

function formatMessage(message) {
	var header = [message.sender, message.createTime].filter(Boolean).join(' — ');
	var text = String(message.text || '').trim();
	return header ? '## ' + header + '\n' + text : text;
}

/** Turns a Chat message event into the single message list phase one sends. */
function messagesFromEvent(event) {
	var message = (event && event.message) || {};
	// argumentText is the text with the mention of this app removed.
	var text = message.argumentText || message.text || '';
	return [
		{
			createTime: message.createTime || '',
			sender: (event.user && (event.user.displayName || event.user.email)) || '',
			text: text
		}
	];
}

/** Builds the client_payload for the repository dispatch. */
function dispatchPayload(options) {
	return {
		report: options.report,
		requester: options.requester || '',
		space: options.space || '',
		thread: options.thread || ''
	};
}

function threadOf(event) {
	var message = (event && event.message) || {};
	return (message.thread && message.thread.name) || '';
}
