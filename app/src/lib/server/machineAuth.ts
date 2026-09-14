import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { createOrUpdateUser, getPool } from '$lib/server/db';
import { introspectToken } from '$lib/server/keycloak';
import { getPodFeatures } from '$lib/server/podFeatures';
import { enrichSessionUser } from '$lib/server/sessionUser';
import type { User } from '$lib/stores';

const BEARER = /^Bearer\s+(\S+)$/i;

// Deployment-level switch. Absent annotations mean an absent flag, so an
// environment that has not opted in keeps the path shut, and an environment
// that has can close it again with kubectl annotate — without a rollout.
const FEATURE = 'MachineAuthentication';

export function readBearerToken(header: string | null): string | undefined {
	return BEARER.exec(header ?? '')?.[1];
}

export function parseClientIds(value: string | undefined): string[] {
	return (value ?? '')
		.split(/[,\s]+/)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

/**
 * Authenticates a machine account that presents an OAuth access token.
 *
 * This is the only way into the application without a browser session, and it
 * exists so that automation — the bug investigation agent filing a ticket —
 * can act as an identity with its own memberships instead of a shared super
 * user. Two independent switches guard it: the MachineAuthentication feature
 * flag has to be on, and the token has to come from a client listed in
 * MACHINE_CLIENT_IDS, so an access token minted for the web application cannot
 * be replayed here.
 *
 * Returns undefined for anything it does not accept, and never throws: a
 * broken introspection endpoint must not turn every request into a 500.
 */
export async function machineUser(request: Request): Promise<User | undefined> {
	const token = readBearerToken(request.headers.get('Authorization'));
	if (!token) {
		return undefined;
	}

	if (!(await getPodFeatures()).get(FEATURE)) {
		return undefined;
	}

	const allowedClients = parseClientIds(privateEnv.MACHINE_CLIENT_IDS);
	if (allowedClients.length == 0) {
		log.warn('A bearer token was presented but MACHINE_CLIENT_IDS is not configured.');
		return undefined;
	}

	try {
		const introspection = await introspectToken(token);
		if (!introspection.active || !introspection.sub) {
			return undefined;
		}
		if (!introspection.azp || !allowedClients.includes(introspection.azp)) {
			log.warn(`Refused a bearer token issued to ${introspection.azp ?? 'an unnamed client'}.`);
			return undefined;
		}

		// The identity has to exist as a user before it can be given
		// memberships in the member management, so it is recorded on first use
		// the same way the session callback records a person signing in.
		const pool = await getPool();
		await pool.connect(
			createOrUpdateUser(
				{
					family_name: introspection.family_name ?? '',
					given_name: introspection.given_name ?? '',
					guid: introspection.sub,
					realm: env.PUBLIC_KC_REALM ?? '',
					settings: {}
				},
				true
			)
		);

		return {
			...(await enrichSessionUser(introspection.sub, introspection.realm_access?.roles ?? [])),
			isAuthenticated: true
		};
	} catch (error) {
		log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
		return undefined;
	}
}
