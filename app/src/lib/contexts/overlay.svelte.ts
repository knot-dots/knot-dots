import { createContext, untrack } from 'svelte';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import loadOverlay, { type OverlayData } from '$lib/client/loadOverlay';
import type { AddToast } from '$lib/contexts/toast';
import { overlayKey, paramsFromFragment } from '$lib/models';

export interface OverlayContext {
	readonly data: OverlayData | undefined;
	// Hash parameters of the overlays opened one after another, for going back
	history: URLSearchParams[];
}

// Loads the overlay requested by the hash of the current URL and reports
// failures as toasts. Must be created during component initialization.
export function createOverlayContext(addToast: AddToast): OverlayContext {
	let data = $state.raw<OverlayData>();
	let history = $state.raw<URLSearchParams[]>([]);

	// Hash parameters of the overlay whose data is shown
	let displayedHash: string | undefined;

	// Undefined until the first update, so that an empty hash still resets the history
	let previousHashState: string | undefined;
	let currentHashSequence = 0;

	async function update(url: URL, pageData: App.PageData) {
		const hashParams = paramsFromFragment(url);

		if (hashParams.toString() == previousHashState && !hashParams.has(overlayKey.enum.members)) {
			return;
		}

		previousHashState = hashParams.toString();

		let addedToHistory = false;

		if (hashParams.size > 0) {
			if (hashParams.toString() != (history[history.length - 1]?.toString() ?? '')) {
				history = [...history, hashParams];
				addedToHistory = true;
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
				displayedHash = nextData ? hashParams.toString() : undefined;
			}
		} catch (error) {
			console.error(error);
			// Reloading the shown overlay failed, e.g. the members overlay after a page
			// update; it keeps showing its previous data
			if (thisSequence !== currentHashSequence || hashParams.toString() === displayedHash) {
				return;
			}
			addToast({
				heading: unwrapFunctionStore(_)('toast.overlay_load_error.heading'),
				message: unwrapFunctionStore(_)('toast.overlay_load_error.message'),
				status: 'error'
			});
			await restoreHash(addedToHistory);
		}
	}

	// Points the hash back to the overlay that is shown, or removes it, so that the
	// failed overlay can be requested again, e.g. by clicking the same card.
	function restoreHash(addedToHistory: boolean) {
		if (displayedHash === undefined) {
			history = [];
		} else {
			if (addedToHistory) {
				history = history.slice(0, history.length - 1);
			}
			// Going back already removed the shown overlay from the history
			if (history[history.length - 1]?.toString() !== displayedHash) {
				history = [...history, new URLSearchParams(displayedHash)];
			}
		}

		// The data of the overlay to go back to is still there
		previousHashState = displayedHash ?? '';

		return goto(`#${displayedHash ?? ''}`, { keepFocus: true, noScroll: true, replaceState: true });
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
