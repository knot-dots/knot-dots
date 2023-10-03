import { derived, writable } from 'svelte/store';
import defineAbilityFor from '$lib/authorization';
import type { Container } from '$lib/models';

export const navigationToggle = writable(false);

export const sidebarToggle = writable(true);

export const filtersToggle = writable(true);

export const sortToggle = writable(false);

export type User = {
	familyName: string;
	givenName: string;
	guid: string;
	isAuthenticated: boolean;
	roles: string[];
};

export const user = writable<User>({
	familyName: '',
	givenName: '',
	guid: '',
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

export const dragged = writable<Container | undefined>();
