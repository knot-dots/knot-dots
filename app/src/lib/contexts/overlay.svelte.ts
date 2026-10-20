import { createContext, untrack } from 'svelte';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { page } from '$app/state';
import loadOverlay, { type OverlayData, overlayTarget } from '$lib/client/loadOverlay';
import type { AddToast } from '$lib/contexts/toast';
import { overlayKey, paramsFromFragment } from '$lib/models';
import { overlayHistory } from '$lib/stores';

export interface OverlayContext {
	// Undefined while no overlay is open or the first one is loading
	readonly data: OverlayData | undefined;
	// Whether data for the overlay requested by the hash is being loaded
	readonly loading: boolean;
	// Whether the overlay is loading another object than the one it shows, as
	// opposed to e.g. applying a filter to the object it shows
	readonly switching: boolean;
}

// Loads the data of the overlay requested by the hash of the current URL and
// reports failures as a toast. Must be created during component initialization.
export function createOverlayContext(addToast: AddToast): OverlayContext {
	let data = $state.raw<OverlayData>();
	let loading = $state(false);
	let switching = $state(false);

	let previousHashState = '';
	let currentHashSequence = 0;
	let displayedTarget: string | undefined;

	async function update(url: URL, pageData: App.PageData) {
		const hashParams = paramsFromFragment(url);

		if (hashParams.toString() == previousHashState && !hashParams.has(overlayKey.enum.members)) {
			return;
		}

		previousHashState = hashParams.toString();

		if (hashParams.size > 0) {
			overlayHistory.update((value) =>
				hashParams.toString() == (value[value.length - 1]?.toString() ?? '')
					? value
					: [...value, hashParams]
			);
		} else {
			overlayHistory.set([]);
		}

		currentHashSequence++;
		const thisSequence = currentHashSequence;
		const isLatest = () => thisSequence === currentHashSequence;

		const target = overlayTarget(hashParams);

		if (!target) {
			displayedTarget = undefined;
			data = undefined;
			loading = false;
			switching = false;
			return;
		}

		loading = true;
		switching = displayedTarget !== undefined && target !== displayedTarget;

		try {
			const result = await loadOverlay(pageData, hashParams);
			if (isLatest()) {
				displayedTarget = target;
				data = result;
			}
		} catch (error) {
			if (isLatest()) {
				console.error(error);
				// Allows to retry by requesting the same overlay again
				previousHashState = '';
				addToast({
					heading: unwrapFunctionStore(_)('toast.overlay_load_error.heading'),
					message: unwrapFunctionStore(_)('toast.overlay_load_error.message'),
					status: 'error'
				});
			}
		} finally {
			if (isLatest()) {
				loading = false;
				switching = false;
			}
		}
	}

	$effect(() => {
		// Like the page store, every change of the page is considered, so that
		// e.g. the members overlay is reloaded after invalidation.
		const { data: pageData, url } = page;
		untrack(() => update(url, pageData));
	});

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get switching() {
			return switching;
		}
	};
}

export const [getOverlayContext, setOverlayContext] = createContext<OverlayContext>();
