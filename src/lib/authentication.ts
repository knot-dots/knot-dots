import Keycloak from 'keycloak-js';
import type { KeycloakInitOptions } from 'keycloak-js';
import { z } from 'zod';
import { page } from '$app/stores';
import { env } from '$env/dynamic/public';
import { keycloak, user } from '$lib/stores';
import { isAdminOf, isMemberOf } from '$lib/models';

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
			adminOf: [],
			familyName: kc.idTokenParsed?.family_name ?? '',
			givenName: kc.idTokenParsed?.given_name ?? '',
			guid: kc.idTokenParsed?.sub ?? '',
			isAuthenticated: true,
			memberOf: [],
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
			adminOf: [],
			familyName: '',
			givenName: '',
			guid: '',
			isAuthenticated: false,
			memberOf: [],
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

	page.subscribe(({ data }) => {
		keycloak.set({
			accountUrl: kc.createAccountUrl(),
			loginUrl: kc.createLoginUrl(),
			logoutUrl: kc.createLogoutUrl(),
			registerUrl: kc.createRegisterUrl()
		});
		user.update((value) => {
			const adminOf = [];
			if (isAdminOf(value, data.currentOrganization)) {
				adminOf.push(data.currentOrganization.guid);
			}
			if (data.currentOrganizationalUnit && isAdminOf(value, data.currentOrganizationalUnit)) {
				adminOf.push(data.currentOrganizationalUnit);
			}

			const memberOf = [];
			if (isMemberOf(value, data.currentOrganization)) {
				memberOf.push(data.currentOrganization.guid);
			}
			if (data.currentOrganizationalUnit && isMemberOf(value, data.currentOrganizationalUnit)) {
				memberOf.push(data.currentOrganizationalUnit);
			}

			return {
				...value,
				adminOf: Array.from(new Set([...value.adminOf, ...adminOf])),
				memberOf: Array.from(new Set([...value.memberOf, ...memberOf]))
			};
		});
	});

	return kc;
}

export const key = Symbol();

export interface KeycloakContext {
	getKeycloak: () => Keycloak;
}
