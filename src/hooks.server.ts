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
import { createOrUpdateUser, getAllMembershipRelationsOfUser, getPool } from '$lib/server/db';

const baseURL = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:5173');
const useSecureCookies = baseURL.protocol === 'https:';
const { handle: authentication } = SvelteKitAuth({
	callbacks: {
		async jwt({ token, user, account }) {
			if (user) {
				token.familyName = user.familyName;
				token.givenName = user.givenName;
				token.sub = user.id;
			}
			if (account?.access_token) {
				// decode without validating
				const { realm_access, sub }: { realm_access: { roles: string[] }; sub: string } =
					JSON.parse(Buffer.from(account.access_token.split('.')[1], 'base64').toString());
				token.roles = realm_access.roles;
				token.sub = sub;
			}
			return token;
		},
		async session({ session, token }) {
			const pool = await getPool();
			const [containerUserRelations] = await Promise.all([
				pool.connect(getAllMembershipRelationsOfUser(token.sub as string)),
				pool.connect(
					createOrUpdateUser({
						display_name: `${token.givenName} ${token.familyName}`.trim(),
						guid: token.sub as string,
						realm: env.PUBLIC_KC_REALM ?? ''
					})
				)
			]);
			session.user.adminOf = containerUserRelations
				.filter(({ predicate }) => predicate == predicates.enum['is-admin-of'])
				.map(({ object }) => object);
			session.user.familyName = token.familyName as string;
			session.user.givenName = token.givenName as string;
			session.user.guid = token.sub as string;
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
		features.push('NewOnboardingWorkflow')
	}
	event.locals.featureDecisions = createFeatureDecisions(features)

	return resolve(event);
}) satisfies Handle;

export const handleError = (async ({ error }) => {
	log.error(serializeError(error), String(error));
	return {
		message: unwrapFunctionStore(_)('error.unexpected')
	};
}) satisfies HandleServerError;
