import type { Handle } from '@sveltejs/kit';
import { AsyncLocalStorage } from 'async_hooks';
import { featureFlags } from '$lib/features';
import { getPodFeatures } from '$lib/server/podFeatures';

const storage = new AsyncLocalStorage<string[]>();

// Users choose from the flags the rings offer, nothing else: settings are
// user-supplied data and may carry arbitrary or stale flag names, such as a
// flag that has since moved under deployment control.
const ringFlags = new Set<string>([...featureFlags.values()].flat());

export const withFeatures: Handle = async ({ event, resolve }) => {
	// Flags carrying a pod annotation are governed by the deployment alone;
	// stale entries in the user's settings must not resurrect them.
	const podFeatures = await getPodFeatures();
	event.locals.features = [
		...(event.locals.user.settings.features ?? []).filter(
			(flag) => ringFlags.has(flag) && !podFeatures.has(flag)
		),
		...[...podFeatures.entries()].filter(([, enabled]) => enabled).map(([flag]) => flag)
	];
	return storage.run(event.locals.features, () => resolve(event));
};

export const getFeatures = () => storage.getStore() ?? [];
