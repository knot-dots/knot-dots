import Keycloak from 'keycloak-js';
import type { KeycloakInitOptions } from 'keycloak-js';
import { z } from 'zod';
import { page } from '$app/stores';
import { env } from '$env/dynamic/public';
import { keycloak, user } from '$lib/stores';

export const tokens = z.object({
	idToken: z.string(),
	refreshToken: z.string(),
	token: z.string()
});

async function storeTokens(subject: string, idToken: string, refreshToken: string, token: string) {
	const response = await fetch('/tokens/store', {
		body: JSON.stringify({ idToken, refreshToken, token }),
		credentials: 'same-origin',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error((await response.json()).message);
	}
}

async function clearTokens(subject: string, token: string) {
	const response = await fetch('/tokens/clear', {
		credentials: 'same-origin',
		headers: {
			Authorization: `Bearer ${token}`
		},
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error((await response.json()).message);
	}
}

async function fetchTokens() {
	const response = await fetch('/tokens');
	if (response.ok) {
		const data = await response.json();
		return tokens.parse(data);
	} else {
		return { idToken: '', refreshToken: '', token: '' };
	}
}

export async function initKeycloak(initOptions: KeycloakInitOptions) {
	const kc = new Keycloak({
		url: env.PUBLIC_KC_URL ?? '',
		realm: env.PUBLIC_KC_REALM ?? '',
		clientId: env.PUBLIC_KC_CLIENT_ID ?? ''
	});

	kc.onAuthSuccess = async () => {
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
		try {
			await storeTokens(
				kc.subject as string,
				kc.idToken as string,
				kc.refreshToken as string,
				kc.token as string
			);
		} catch (error) {
			console.log(error);
		}
	};

	kc.onAuthRefreshError = kc.clearToken;

	kc.onAuthLogout = async () => {
		user.set({
			familyName: '',
			givenName: '',
			isAuthenticated: false,
			roles: []
		});
		try {
			await clearTokens(kc.subject as string, kc.token as string);
		} catch (error) {
			console.log(error);
		}
	};

	try {
		const { idToken, refreshToken, token } = await fetchTokens();
		await kc.init({
			...initOptions,
			idToken,
			refreshToken,
			token
		});
	} catch (error) {
		console.log(error);
	}

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
