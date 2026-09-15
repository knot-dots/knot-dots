// The Google Chat side of the bugfix agent.
//
// The app only receives an event when someone @mentions it in a space, which
// is exactly the trigger we want: "@claude, kannst Du diesen Fehler beheben".
// This file stays thin — every decision it makes lives in lib.js, which is
// covered by chat-bridge/lib.test.mjs. Chat expects a reply within 30 seconds,
// so the handler does its work and returns the acknowledgement synchronously.

var ACK =
	'Verstanden, ich schaue mir das an. Ich melde mich in diesem Thread, sobald ' +
	'ich ein Ergebnis habe.';

var HELP =
	'Ich behebe Fehler, die hier gemeldet werden. Antworte im Thread eines ' +
	'Bugreports mit einer Erwähnung und einem Satz dazu, was kaputt ist — zum ' +
	'Beispiel „@claude, kannst Du diesen Fehler beheben". Ich reproduziere ihn, ' +
	'schreibe einen Test, stelle einen Draft-Pull-Request und melde mich hier ' +
	'zurück.';

function readConfig() {
	var properties = PropertiesService.getScriptProperties();
	return {
		allowedSenders: parseList(properties.getProperty('ALLOWED_SENDERS')),
		allowedSpaces: parseList(properties.getProperty('ALLOWED_SPACES')),
		eventType: properties.getProperty('DISPATCH_EVENT_TYPE') || 'chat-bugfix',
		repository: properties.getProperty('GITHUB_REPOSITORY') || 'knot-dots/knot-dots',
		token: properties.getProperty('GITHUB_TOKEN')
	};
}

function onMessage(event) {
	var config = readConfig();
	var decision = isAllowed(event, config);

	if (!decision.allowed) {
		// The space name is logged because there is no other convenient way to
		// learn it when filling in ALLOWED_SPACES for the first time.
		console.warn(
			'Refused a request: ' +
				decision.reason +
				' (space ' +
				((event.space && event.space.name) || 'unknown') +
				', sender ' +
				((event.user && event.user.email) || 'unknown') +
				')'
		);
		return { text: refusalText(decision.reason) };
	}

	var report = buildTranscript(messagesFromEvent(event));
	if (!report) {
		return {
			text: 'Ich brauche noch eine Beschreibung: Was hast Du getan, was ist passiert?'
		};
	}

	try {
		dispatch(config, {
			report: report,
			requester: (event.user && event.user.email) || '',
			space: (event.space && event.space.name) || '',
			thread: threadOf(event)
		});
	} catch (error) {
		console.error(error);
		return { text: 'Ich konnte den Lauf nicht starten: ' + error.message };
	}

	return { text: ACK };
}

function onAddToSpace() {
	return { text: HELP };
}

function onRemoveFromSpace(event) {
	console.info('Removed from ' + ((event.space && event.space.name) || 'a space') + '.');
}

function refusalText(reason) {
	if (reason === 'not-configured') {
		return 'Ich bin noch nicht fertig eingerichtet und starte deshalb nichts.';
	}
	if (reason === 'space') {
		return 'In diesem Raum bin ich nicht für Bugfixes freigegeben.';
	}
	return 'Aufträge nehme ich nur von den freigegebenen Entwickler-Accounts an.';
}

function dispatch(config, options) {
	if (!config.token) {
		throw new Error('Script property GITHUB_TOKEN is not set.');
	}

	var response = UrlFetchApp.fetch(
		'https://api.github.com/repos/' + config.repository + '/dispatches',
		{
			contentType: 'application/json',
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: 'Bearer ' + config.token,
				'X-GitHub-Api-Version': '2022-11-28'
			},
			method: 'post',
			muteHttpExceptions: true,
			payload: JSON.stringify({
				client_payload: dispatchPayload(options),
				event_type: config.eventType
			})
		}
	);

	var status = response.getResponseCode();
	if (status !== 204) {
		throw new Error('GitHub answered with ' + status + ': ' + response.getContentText());
	}
}
