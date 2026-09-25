import type { Handle } from '@sveltejs/kit';
import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage<string>();

// Makes the guid of the authenticated user available to the database read
// paths, which enrich containers with that user's computed grants (see
// applyUserGrants). Runs after the handle that builds locals.user; outside a
// request (workers, scripts, tests) the read paths see no user and skip the
// enrichment.
export const withRequestUser: Handle = ({ event, resolve }) =>
	runAsRequestUser(event.locals.user.isAuthenticated ? event.locals.user.guid : '', () =>
		resolve(event)
	);

// Runs fn with guid as the request user, for requests that authenticate
// outside the session, such as MCP requests with a personal access token.
export const runAsRequestUser = <T>(guid: string, fn: () => T): T => storage.run(guid, fn);

export const getRequestUser = () => storage.getStore() ?? '';
