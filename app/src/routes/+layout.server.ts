import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { type KeycloakUser, payloadTypes } from '$lib/models';
import { loadApplicationContext } from '$lib/server/applicationContext';
import { findUserById } from '$lib/server/keycloak';
import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, depends, locals, params, url }) => {
	depends(payloadTypes.enum.organization, payloadTypes.enum.organizational_unit);

	let user: KeycloakUser | undefined = undefined;
	const context = await loadApplicationContext({ locals, cookies, params, url });

	if (env.PUBLIC_DONT_USE_SUBDOMAINS) {
		cookies.set('current-organization-guid', context.currentOrganization.guid, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:'
		});
	}

	if (url.searchParams.has('signup')) {
		try {
			const foundUser = await findUserById(url.searchParams.get('signup') as string);
			if (!foundUser.emailVerified) {
				user = foundUser;
			}
		} catch (error) {
			log.warn(isErrorLike(error) ? serializeError(error) : {}, String(error));
		}
	}

	return {
		...context,
		session: await locals.auth(),
		user
	};
};
