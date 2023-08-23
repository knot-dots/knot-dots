import { derived, writable } from 'svelte/store';
import defineAbilityFor from '$lib/authorization';

export const navigationToggle = writable(false);

export const sidebarToggle = writable(true);

export const filtersToggle = writable(false);

export const sortToggle = writable(false);

export type User = {
	familyName: string;
	givenName: string;
	isAuthenticated: boolean;
	roles: string[];
};

export const user = writable<User>({
	familyName: '',
	givenName: '',
	isAuthenticated: false,
	roles: []
});

export const ability = derived(user, defineAbilityFor);

export const keycloak = writable({
	accountUrl: '',
	loginUrl: '',
	logoutUrl: '',
	registerUrl: ''
});
