import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { predicates } from '$lib/models';
import { getAllMembershipRelationsOfUser, getPool, getUser } from '$lib/server/db';
import type { User } from '$lib/stores';

export type SessionUser = Omit<User, 'isAuthenticated'>;

export function emptySessionUser(guid = '', roles: string[] = []): SessionUser {
	return {
		adminOf: [],
		collaboratorOf: [],
		familyName: '',
		givenName: '',
		guid,
		headOf: [],
		memberOf: [],
		roles,
		settings: {}
	};
}

/**
 * Loads the profile and memberships a user's permissions are derived from.
 *
 * Never throws. Both callers — the session callback and the machine token path —
 * treat a failure as "this identity has no memberships" rather than as an
 * error, and for the session callback that is essential: if it throws, Auth.js
 * treats the session as broken and deletes the session cookie, logging the
 * user out for good.
 */
export async function enrichSessionUser(guid: string, roles: string[]): Promise<SessionUser> {
	const sessionUser = emptySessionUser(guid, roles);

	try {
		const pool = await getPool();
		const [user, membershipRelations] = await Promise.all([
			pool.connect(getUser(guid)),
			pool.connect(getAllMembershipRelationsOfUser(guid))
		]);
		const objectsRelatedBy = (predicate: string) =>
			membershipRelations
				.filter((relation) => relation.predicate == predicate)
				.map(({ object }) => object);

		sessionUser.adminOf = objectsRelatedBy(predicates.enum['is-admin-of']);
		sessionUser.collaboratorOf = objectsRelatedBy(predicates.enum['is-collaborator-of']);
		sessionUser.familyName = user.family_name;
		sessionUser.givenName = user.given_name;
		sessionUser.headOf = objectsRelatedBy(predicates.enum['is-head-of']);
		sessionUser.memberOf = objectsRelatedBy(predicates.enum['is-member-of']);
		sessionUser.settings = user.settings;
	} catch (error) {
		log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
	}

	return sessionUser;
}
