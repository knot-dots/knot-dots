import { getContext, setContext } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { SvelteSet } from 'svelte/reactivity';

const key = {};

interface BulkAction {
	actions: string[];
	cascadingDelete?: boolean;
	name?: string;
	onSuccess?: () => void;
	registerTarget?: Attachment<HTMLInputElement>;
	selected: SvelteSet<string>;
	targets?: SvelteSet<HTMLInputElement>;
}

export function setBulkActionContext(context: BulkAction) {
	const targets = new SvelteSet<HTMLInputElement>();

	const registerTarget: Attachment<HTMLInputElement> = (element) => {
		targets.add(element);
		return () => targets.delete(element);
	};

	setContext(key, {
		cascadingDelete: false,
		name: `bulk-action-context-${crypto.randomUUID()}`,
		targets,
		registerTarget,
		...context
	});
}

export function getBulkActionContext() {
	return getContext(key) as Omit<
		BulkAction,
		'cascadingDelete' | 'name' | 'registerTarget' | 'targets'
	> &
		Required<Pick<BulkAction, 'cascadingDelete' | 'name' | 'registerTarget' | 'targets'>>;
}
