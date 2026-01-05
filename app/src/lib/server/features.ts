import type { Handle } from '@sveltejs/kit';
import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage<string[]>();

export const withFeatures: Handle = ({ event, resolve }) => {
	event.locals.features = event.locals.user.settings.features ?? [];
	return storage.run(event.locals.features, () => resolve(event));
};

export const getFeatures = () => storage.getStore() ?? [];
