import type { Handle, RequestEvent } from '@sveltejs/kit';
import { AsyncLocalStorage } from 'async_hooks';
import { featureFlags } from '$lib/features';
import { getPodFeatures } from '$lib/server/podFeatures';

const storage = new AsyncLocalStorage<string[]>();

const enabledFlags = (podFeatures: Map<string, boolean>) =>
	[...podFeatures.entries()].filter(([, enabled]) => enabled).map(([flag]) => flag);

// Users choose from the flags the rings offer, nothing else: settings are
// user-supplied data and may carry arbitrary or stale flag names, such as a
// flag that has since moved under deployment control.
const ringFlags = new Set<string>([...featureFlags.values()].flat());

// The deployment-governed flags are known before the user is: the handle runs
// ahead of authentication so that even the session callback can consult
// getFeatures(). The user's ring flags join through addUserFeatures once the
// session has been loaded.
export const withFeatures: Handle = async ({ event, resolve }) => {
	event.locals.features = enabledFlags(await getPodFeatures());
	return storage.run(event.locals.features, () => resolve(event));
};

// The ring flags a user has chosen. Flags carrying a pod annotation are
// governed by the deployment alone; stale entries in the user's settings must
// not resurrect them.
export async function getUserFeatures(settings: { features?: string[] }) {
	const podFeatures = await getPodFeatures();
	return (settings.features ?? []).filter((flag) => ringFlags.has(flag) && !podFeatures.has(flag));
}

export async function addUserFeatures(event: RequestEvent) {
	event.locals.features.push(...(await getUserFeatures(event.locals.user.settings)));
}

export const getFeatures = () => storage.getStore() ?? [];
