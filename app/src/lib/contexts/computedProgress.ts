import type DataLoader from 'dataloader';
import { getContext, setContext } from 'svelte';
import type { AnyPayload, Container } from '$lib/models';

const key = {};

export type ComputedProgressLoader = DataLoader<string, Container<AnyPayload>[]>;

export function setComputedProgressContext(loader: ComputedProgressLoader) {
	setContext(key, loader);
}

export function getComputedProgressContext() {
	return getContext(key) as ComputedProgressLoader | undefined;
}
