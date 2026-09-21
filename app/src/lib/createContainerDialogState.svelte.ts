import { writable, type Writable } from 'svelte/store';
import type { PendingContainerCopy } from '$lib/containerCopy';
import type { NewContainer } from '$lib/models';

export type CreateContainerDialogState =
	| { kind: 'create'; container: NewContainer }
	| { kind: 'copy'; container: NewContainer; request: PendingContainerCopy };

// Retain this returned draft when caching it: proxy edits do not mutate the original object.
export function createContainerDialogDraft<T extends CreateContainerDialogState>(state: T): T {
	const draft = $state(state);
	return draft;
}

const state = writable<CreateContainerDialogState | undefined>();

// Keep synchronous store notifications for existing callers, while nested editors share a proxy.
export const createContainerDialogState: Writable<CreateContainerDialogState | undefined> = {
	subscribe: state.subscribe,
	set(value) {
		state.set(value === undefined ? undefined : createContainerDialogDraft(value));
	},
	update(updater) {
		state.update((value) => {
			const next = updater(value);
			return next === undefined ? undefined : createContainerDialogDraft(next);
		});
	}
};

// Ordinary creation clears any previous copy intent.
export const newContainer: Writable<NewContainer | undefined> = {
	subscribe(run, invalidate) {
		return createContainerDialogState.subscribe((state) => run(state?.container), invalidate);
	},
	set(container) {
		createContainerDialogState.set(container ? { kind: 'create', container } : undefined);
	},
	update(updater) {
		createContainerDialogState.update((state) => {
			const container = updater(state?.container);
			return container ? { kind: 'create', container } : undefined;
		});
	}
};

export function openContainerCopyDialog(container: NewContainer, request: PendingContainerCopy) {
	createContainerDialogState.set({ kind: 'copy', container, request });
}
