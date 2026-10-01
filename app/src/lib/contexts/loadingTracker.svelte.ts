import { getContext, setContext } from 'svelte';

const key = {};

// Counts the parts of a page or an overlay that are loading data on their own,
// so that a single progress bar can indicate all of them.
export class LoadingTracker {
	#count = $state(0);

	get active() {
		return this.#count > 0;
	}

	add() {
		this.#count++;
		return () => {
			this.#count--;
		};
	}
}

export function setLoadingTrackerContext(tracker: LoadingTracker) {
	setContext(key, tracker);
}

// Reports the loading state of a component to the closest page or overlay.
export function trackLoading(loading: () => boolean) {
	const tracker = getContext<LoadingTracker | undefined>(key);

	$effect(() => {
		if (tracker && loading()) {
			return tracker.add();
		}
	});
}
