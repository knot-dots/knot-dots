import Keycloak from '@auth/core/providers/keycloak';
import { SvelteKitAuth } from '@auth/sveltekit';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { _, locale, unwrapFunctionStore } from 'svelte-i18n';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { createOrUpdateUser, getPool } from '$lib/server/db';
import { ensureDefaultCategoryTerms } from '$lib/server/defaultCategories';
import { withFeatures } from '$lib/server/features';
import { withLogger } from '$lib/server/logger';
import { machineUser } from '$lib/server/machineAuth';
import { emptySessionUser, enrichSessionUser } from '$lib/server/sessionUser';

const baseURL = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:5173');
const useSecureCookies = baseURL.protocol === 'https:';

export const withAuthentication: Handle = ({ event, resolve }) => {
	const { handle } = SvelteKitAuth({
		callbacks: {
			async jwt({ token, account }) {
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
						createOrUpdateUser(
							{
								family_name: family_name,
								given_name: given_name,
								guid: sub,
								realm: env.PUBLIC_KC_REALM ?? '',
								settings: {}
							},
							true
						)
					);
				}
				return token;
			},
			async session({ session, token }) {
				// enrichSessionUser swallows its own failures on purpose: if this
				// callback throws, Auth.js treats the session as broken and deletes
				// the session cookie, logging the user out for good.
				Object.assign(
					session.user,
					await enrichSessionUser(token.sub as string, (token.roles as string[]) ?? [])
				);
				return session;
			}
		},
		cookies: {
			sessionToken: {
				name: `${useSecureCookies ? '__Secure-' : ''}next-auth.session-token`,
				options: {
					domain: event.url.hostname.endsWith(baseURL.hostname)
						? `.${baseURL.hostname}`
						: event.url.hostname,
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
	return handle({ event, resolve });
};

export const handle = sequence(
	withLogger,
	withAuthentication,
	async ({ event, resolve }) => {
		const lang = event.request.headers.get('accept-language')?.split(',')[0];
		locale.set(lang ?? 'de');

		const pool = await getPool();
		event.locals.pool = pool;
		await ensureDefaultCategoryTerms(pool);

		event.locals.session = await event.locals.auth();
		if (event.locals.session) {
			event.locals.user = {
				...event.locals.session.user,
				isAuthenticated: true
			};
		} else {
			// Without a browser session, an OAuth access token from a machine
			// account is the only other way in. Anything it does not accept
			// stays anonymous rather than becoming an error.
			event.locals.user = (await machineUser(event.request)) ?? {
				...emptySessionUser(),
				isAuthenticated: false
			};
		}

		if (
			event.locals.user.isAuthenticated &&
			event.url.searchParams.has('redirectToProfileIfLoggedIn')
		) {
			redirect(302, '/me');
		}

		return resolve(event);
	},
	withFeatures
);

export const handleError = async ({ error }) => {
	log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
	return {
		message: unwrapFunctionStore(_)('error.unexpected')
	};
};
