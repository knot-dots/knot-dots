import { getContext, setContext } from 'svelte';
import type { SvelteSet } from 'svelte/reactivity';

const key = {};

interface BulkAction {
	actions: string[];
	selected: SvelteSet<string>;
}

export function setBulkActionContext(context: BulkAction) {
	setContext(key, context);
}

export function getBulkActionContext() {
	return getContext(key) as BulkAction;
}
