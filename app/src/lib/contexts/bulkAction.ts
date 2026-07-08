import { getContext, setContext } from 'svelte';
import type { SvelteSet } from 'svelte/reactivity';

const key = {};

interface BulkAction {
	actions: string[];
	cascadingDelete?: boolean;
	name?: string;
	onSuccess?: () => void;
	selected: SvelteSet<string>;
}

export function setBulkActionContext(context: BulkAction) {
	setContext(key, {
		cascadingDelete: false,
		name: `bulk-action-context-${crypto.randomUUID()}`,
		...context
	});
}

export function getBulkActionContext() {
	return getContext(key) as Omit<BulkAction, 'name'> &
		Required<Pick<BulkAction, 'name' | 'cascadingDelete'>>;
}
