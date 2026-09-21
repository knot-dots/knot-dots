import type { DatabaseConnection } from 'slonik';
import { createFeatureDecisions } from '$lib/features';
import { grantRecordsFromGrants } from '$lib/models';
import { getAllGrantsOfUser, getAllGrantsOfUserFromMemberRoles, getUser } from '$lib/server/db';
import { getFeatures } from '$lib/server/features';
import type { User } from '$lib/stores';

export async function loadMcpUserContext(
	connection: DatabaseConnection,
	userId: string
): Promise<User> {
	const user = await getUser(userId)(connection);
	const matrixEnabled = createFeatureDecisions(getFeatures()).usePermissionMatrix();
	const grants = await (
		matrixEnabled ? getAllGrantsOfUser(userId) : getAllGrantsOfUserFromMemberRoles(userId)
	)(connection);

	return {
		familyName: user.family_name,
		givenName: user.given_name,
		grants: grantRecordsFromGrants(grants),
		guid: user.guid,
		isAuthenticated: true,
		// Personal tokens currently carry database grants, not Keycloak realm roles.
		roles: [],
		settings: user.settings
	};
}
