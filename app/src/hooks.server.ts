import Keycloak from '@auth/core/providers/keycloak';
import { SvelteKitAuth } from '@auth/sveltekit';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { _, locale, unwrapFunctionStore } from 'svelte-i18n';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { grantKinds } from '$lib/models';
import { createOrUpdateUser, getAllGrantsOfUser, getPool, getUser } from '$lib/server/db';
import { ensureDefaultCategoryTerms } from '$lib/server/defaultCategories';
import { withFeatures } from '$lib/server/features';
import { withLogger } from '$lib/server/logger';

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
				session.user.creatableOf = [];
				session.user.deletableOf = [];
				session.user.familyName = '';
				session.user.givenName = '';
				session.user.guid = token.sub as string;
				session.user.manageMembersOf = [];
				session.user.readableOf = [];
				session.user.roles = token.roles as string[];
				session.user.settings = {};
				session.user.updatableOf = [];
				// If this callback throws, Auth.js treats the session as broken and
				// deletes the session cookie, logging the user out for good.
				try {
					const pool = await getPool();
					const [user, grants] = await Promise.all([
						pool.connect(getUser(token.sub as string)),
						pool.connect(getAllGrantsOfUser(token.sub as string))
					]);
					session.user.creatableOf = grants
						.filter(({ kind }) => kind == grantKinds.enum.create)
						.map(({ object }) => object);
					session.user.deletableOf = grants
						.filter(({ kind }) => kind == grantKinds.enum.delete)
						.map(({ object }) => object);
					session.user.familyName = user.family_name;
					session.user.givenName = user.given_name;
					session.user.manageMembersOf = grants
						.filter(({ kind }) => kind == grantKinds.enum['manage-members'])
						.map(({ object }) => object);
					session.user.readableOf = grants
						.filter(({ kind }) => kind == grantKinds.enum.read)
						.map(({ object }) => object);
					session.user.settings = user.settings;
					session.user.updatableOf = grants
						.filter(({ kind }) => kind == grantKinds.enum.update)
						.map(({ object }) => object);
				} catch (error) {
					log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
				}
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
			event.locals.user = {
				creatableOf: [],
				deletableOf: [],
				familyName: '',
				givenName: '',
				guid: '',
				isAuthenticated: false,
				manageMembersOf: [],
				readableOf: [],
				roles: [],
				settings: {},
				updatableOf: []
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
