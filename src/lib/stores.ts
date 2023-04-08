import { writable } from 'svelte/store';

export const navigationToggle = writable(false);

export const user = writable({ familyName: '', givenName: '', isAuthenticated: false });

export const keycloak = writable({
	accountUrl: '',
	loginUrl: '',
	logoutUrl: '',
	registerUrl: ''
});
