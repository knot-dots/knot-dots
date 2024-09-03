import Keycloak from '@auth/core/providers/keycloak';
import { SvelteKitAuth } from '@auth/sveltekit';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { Roarr as log } from 'roarr';
import { serializeError } from 'serialize-error';
import { _, locale, unwrapFunctionStore } from 'svelte-i18n';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { createFeatureDecisions } from '$lib/features';
import { predicates } from '$lib/models';
import {
	createOrUpdateUser,
	getAllMembershipRelationsOfUser,
	getPool,
	getUser
} from '$lib/server/db';

const baseURL = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:5173');
const useSecureCookies = baseURL.protocol === 'https:';
const { handle: authentication } = SvelteKitAuth({
	callbacks: {
		async jwt({ token, user, account }) {
			if (user) {
				token.sub = user.id;
			}
			if (account?.access_token) {
				// decode without validating
				const {
					family_name,
					given_name,
					realm_access,
					sub
				}: {
					family_name: string;
					given_name: string;
					realm_access: { roles: string[] };
					sub: string;
				} = JSON.parse(Buffer.from(account.access_token.split('.')[1], 'base64').toString());
				token.roles = realm_access.roles;
				token.sub = sub;
				const pool = await getPool();
				await pool.connect(
					createOrUpdateUser({
						family_name: family_name,
						given_name: given_name,
						guid: sub,
						realm: env.PUBLIC_KC_REALM ?? ''
					})
				);
			}
			return token;
		},
		async session({ session, token }) {
			const pool = await getPool();
			const [user, containerUserRelations] = await Promise.all([
				pool.connect(getUser(token.sub as string)),
				pool.connect(getAllMembershipRelationsOfUser(token.sub as string))
			]);
			session.user.adminOf = containerUserRelations
				.filter(({ predicate }) => predicate == predicates.enum['is-admin-of'])
				.map(({ object }) => object);
			session.user.familyName = user.family_name;
			session.user.givenName = user.given_name;
			session.user.guid = user.guid;
			session.user.memberOf = containerUserRelations
				.filter(({ predicate }) => predicate == predicates.enum['is-member-of'])
				.map(({ object }) => object);
			session.user.roles = token.roles as string[];
			return session;
		}
	},
	cookies: {
		sessionToken: {
			name: `${useSecureCookies ? '__Secure-' : ''}next-auth.session-token`,
			options: {
				domain: `.${baseURL.hostname}`,
				httpOnly: true,
				path: '/',
				sameSite: 'lax',
				secure: useSecureCookies
			}
		}
	},
	providers: [
		Keycloak({
			clientId: env.PUBLIC_KC_CLIENT_ID,
			clientSecret: privateEnv.KC_CLIENT_SECRET,
			issuer: `${env.PUBLIC_KC_URL}/realms/${env.PUBLIC_KC_REALM}`,
			profile(profile) {
				return {
					email: profile.email,
					familyName: profile.family_name,
					givenName: profile.given_name,
					id: profile.sub
				};
			}
		})
	],
	secret: privateEnv.AUTH_SECRET,
	trustHost: true
});

export const handle = sequence(authentication, async ({ event, resolve }) => {
	const lang = event.request.headers.get('accept-language')?.split(',')[0];
	locale.set(lang ?? 'de');

	event.locals.pool = await getPool();

	const session = await event.locals.auth();
	if (session) {
		event.locals.user = {
			...session.user,
			isAuthenticated: true
		};
	} else {
		event.locals.user = {
			adminOf: [],
			familyName: '',
			givenName: '',
			guid: '',
			isAuthenticated: false,
			memberOf: [],
			roles: []
		};
	}

	const features = [];
	if (event.locals.user.roles.includes('sysadmin')) {
		features.push('NewOnboardingWorkflow');
	}
	event.locals.featureDecisions = createFeatureDecisions(features);

	return resolve(event);
}) satisfies Handle;

export const handleError = (async ({ error }) => {
	log.error(serializeError(error), String(error));
	return {
		message: unwrapFunctionStore(_)('error.unexpected')
	};
}) satisfies HandleServerError;
