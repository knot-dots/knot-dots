import { writable } from 'svelte/store';
import type Uppy from '@uppy/core';

interface UppyDashboardState {
	open: boolean;
	uppy: Uppy | null;
	props?: any;
}

export const uppyDashboard = writable<UppyDashboardState>({
	open: false,
	uppy: null,
	props: {}
});

export function openDashboard(uppy: Uppy, props: any = {}) {
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
