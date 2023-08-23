import Keycloak from 'keycloak-js';
import type { KeycloakInitOptions } from 'keycloak-js';
import { page } from '$app/stores';
import { env } from '$env/dynamic/public';
import { keycloak, user } from '$lib/stores';

export function initKeycloak(initOptions: KeycloakInitOptions) {
	const kc = new Keycloak({
		url: env.PUBLIC_KC_URL ?? '',
		realm: env.PUBLIC_KC_REALM ?? '',
		clientId: env.PUBLIC_KC_CLIENT_ID ?? ''
	});

	kc.onAuthSuccess = () => {
		user.set({
			familyName: kc.idTokenParsed?.family_name,
			givenName: kc.idTokenParsed?.given_name,
			isAuthenticated: true,
			roles: kc.realmAccess?.roles ?? []
		});
		keycloak.update((v) => ({
			...v,
			logoutUrl: kc.createLogoutUrl()
		}));
		sessionStorage.idToken = kc.idToken;
		sessionStorage.refreshToken = kc.refreshToken;
		sessionStorage.token = kc.token;
	};

	kc.onAuthRefreshSuccess = () => {
		sessionStorage.idToken = kc.idToken;
		sessionStorage.refreshToken = kc.refreshToken;
		sessionStorage.token = kc.token;
	};

	kc.onAuthRefreshError = kc.clearToken;

	kc.onAuthLogout = () => {
		user.set({
			familyName: '',
			givenName: '',
			isAuthenticated: false,
			roles: []
		});
		sessionStorage.removeItem('idToken');
		sessionStorage.removeItem('refreshToken');
		sessionStorage.removeItem('token');
	};

	kc.init({
		...initOptions,
		idToken: sessionStorage.idToken,
		refreshToken: sessionStorage.refreshToken,
		token: sessionStorage.token
	}).catch((reason) => console.log(reason));

	keycloak.update((v) => ({
		...v,
		accountUrl: kc.createAccountUrl(),
		loginUrl: kc.createLoginUrl(),
		registerUrl: kc.createRegisterUrl()
	}));

	page.subscribe(() => {
		keycloak.set({
			accountUrl: kc.createAccountUrl(),
			loginUrl: kc.createLoginUrl(),
			logoutUrl: kc.createLogoutUrl(),
			registerUrl: kc.createRegisterUrl()
		});
	});

	return kc;
}

export const key = Symbol();

export interface KeycloakContext {
	getKeycloak: () => Keycloak;
}
