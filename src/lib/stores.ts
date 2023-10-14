import { derived, writable } from 'svelte/store';
import defineAbilityFor from '$lib/authorization';
import type { Container } from '$lib/models';
import { page } from '$app/stores';

export const navigationToggle = writable(false);

export const sidebarToggle = writable(true);

export const filtersToggle = writable(true);

export const sortToggle = writable(false);

export type User = {
	adminOf: string[];
	familyName: string;
	givenName: string;
	guid: string;
	isAuthenticated: boolean;
	memberOf: string[];
	roles: string[];
};

export const user = derived(page, (values) => {
	if (values.data.session?.user) {
		return {
			...values.data.session?.user,
			isAuthenticated: true
		};
	} else {
		return {
			adminOf: [],
			familyName: '',
			givenName: '',
			guid: '',
			isAuthenticated: false,
			memberOf: [],
			roles: []
		};
	}
});

export const ability = derived(user, defineAbilityFor);

export const dragged = writable<Container | undefined>();
