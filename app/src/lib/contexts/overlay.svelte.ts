import { createContext, untrack } from 'svelte';
import { page } from '$app/state';
import loadOverlay, { type OverlayData, OverlayLoadError } from '$lib/client/loadOverlay';
import { overlayKey, paramsFromFragment } from '$lib/models';

export interface OverlayContext {
	readonly data: OverlayData | undefined;
	// Hash parameters of the overlays opened one after another, for going back
	history: URLSearchParams[];
}

// Loads the overlay requested by the hash of the current URL. Must be created
// during component initialization.
export function createOverlayContext(): OverlayContext {
	let data = $state.raw<OverlayData>();
	let history = $state.raw<URLSearchParams[]>([]);

	// Undefined until the first update, so that an empty hash still resets the history
	let previousHashState: string | undefined;
	let currentHashSequence = 0;

	async function update(url: URL, pageData: App.PageData) {
		const hashParams = paramsFromFragment(url);

		if (hashParams.toString() == previousHashState && !hashParams.has(overlayKey.enum.members)) {
			return;
		}

		previousHashState = hashParams.toString();

		if (hashParams.size > 0) {
			if (hashParams.toString() != (history[history.length - 1]?.toString() ?? '')) {
				history = [...history, hashParams];
			}
		} else {
			history = [];
		}

		currentHashSequence++;
		const thisSequence = currentHashSequence;

		try {
			const nextData = await loadOverlay(pageData, hashParams);
			if (thisSequence === currentHashSequence) {
				data = nextData;
			}
		} catch (error) {
			// The overlay that is open stays open when loading another one fails
			if (!(error instanceof OverlayLoadError)) {
				throw error;
			}
		}
	}

	$effect(() => {
		const url = page.url;
		const pageData = page.data;
		// Like the former page store subscription, shallow routing reloads the members overlay
		void page.state;
		untrack(() => update(url, pageData));
	});

	return {
		get data() {
			return data;
		},
		get history() {
			return history;
		},
		set history(value) {
			history = value;
		}
	};
}

export const [getOverlayContext, setOverlayContext] = createContext<OverlayContext>();
