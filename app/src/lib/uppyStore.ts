import { writable } from 'svelte/store';
import type Uppy from '@uppy/core';

interface UppyDashboardState {
	open: boolean;
	uppy: Uppy | null;
	props: { doneButtonHandler?: () => void; onRequestCloseModal?: () => void };
}

export const uppyDashboard = writable<UppyDashboardState>({
	open: false,
	uppy: null,
	props: {}
});

export function openDashboard(uppy: Uppy, props: UppyDashboardState['props'] = {}) {
	uppyDashboard.set({
		open: true,
		uppy,
		props
	});
}

export function closeDashboard() {
	uppyDashboard.update((state) => ({
		...state,
		open: false,
		props: {}
	}));
}
