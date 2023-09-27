import type { Handle, HandleServerError } from '@sveltejs/kit';
import * as jose from 'jose';
import { Roarr as log } from 'roarr';
import { serializeError } from 'serialize-error';
import { _, locale, unwrapFunctionStore } from 'svelte-i18n';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { getPool } from '$lib/server/db';

export const handle = (async ({ event, resolve }) => {
	const lang = event.request.headers.get('accept-language')?.split(',')[0];
	locale.set(lang ?? 'de');

	if (event.request.headers.get('Authorization')?.startsWith('Bearer ')) {
		const token = (event.request.headers.get('Authorization') as string).substring(7);
		const jwks = jose.createRemoteJWKSet(
			new URL(`${privateEnv.KC_URL}/realms/${env.PUBLIC_KC_REALM}/protocol/openid-connect/certs`)
		);
		try {
			const { payload } = await jose.jwtVerify(token, jwks, {
				issuer: `${env.PUBLIC_KC_URL}/realms/${env.PUBLIC_KC_REALM}`,
				requiredClaims: ['iss', 'sub']
			});
			event.locals.user = { issuer: payload.iss ?? '', subject: payload.sub ?? '' };
		} catch (error) {
			log.warn(serializeError(error), String(error));
		}
	}

	event.locals.pool = await getPool();

	return resolve(event);
}) satisfies Handle;

export const handleError = (async ({ error }) => {
	log.error(serializeError(error), String(error));
	return {
		message: unwrapFunctionStore(_)('error.unexpected')
	};
}) satisfies HandleServerError;
