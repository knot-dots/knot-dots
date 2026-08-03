import type { Handle } from '@sveltejs/kit';
import { AsyncLocalStorage } from 'async_hooks';
import { getPodFeatures } from '$lib/server/podFeatures';

const storage = new AsyncLocalStorage<string[]>();

export const withFeatures: Handle = ({ event, resolve }) => {
	// Flags carrying a pod annotation are governed by the deployment alone;
	// stale entries in the user's settings must not resurrect them.
	const podFeatures = getPodFeatures();
	event.locals.features = [
		...(event.locals.user.settings.features ?? []).filter((flag) => !podFeatures.has(flag)),
		...[...podFeatures.entries()].filter(([, enabled]) => enabled).map(([flag]) => flag)
	];
	return storage.run(event.locals.features, () => resolve(event));
};

export const getFeatures = () => storage.getStore() ?? [];
