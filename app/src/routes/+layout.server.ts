import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { type KeycloakUser } from '$lib/models';
import { findUserById } from '$lib/server/keycloak';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let user: KeycloakUser | undefined = undefined;

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
		session: locals.session,
		user
	};
};
