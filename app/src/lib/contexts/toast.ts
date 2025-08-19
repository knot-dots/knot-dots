import { type Component, getContext, setContext } from 'svelte';
import type { SvelteHTMLElements } from 'svelte/elements';

const key = {};

export interface ToastProps {
	icon?: Component<SvelteHTMLElements['svg']>;
	heading: string;
	message?: string;
	status: 'info' | 'success';
}

export interface AddToast {
	(toast: ToastProps): void;
}

export function setToastContext(addToast: AddToast) {
	setContext(key, addToast);
}

export function getToastContext() {
	return getContext(key) as AddToast;
}
