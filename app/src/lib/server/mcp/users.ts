import type { DatabaseConnection } from 'slonik';
import { getOrganizationMemberships } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type {
	SearchOrganizationUsersInput,
	SearchOrganizationUsersOutput,
	UserName
} from '$lib/server/mcp/contracts/users';

export class McpUserError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpUserError';
	}
}

export function searchMcpOrganizationUsers({
	limit,
	offset,
	organizationGuid,
	terms,
	userId
}: SearchOrganizationUsersInput & { userId: string }) {
	return async (connection: DatabaseConnection): Promise<SearchOrganizationUsersOutput> => {
		const memberships = await getOrganizationMemberships(userId)(connection);
		if (!memberships.some(({ guid }) => guid === organizationGuid)) {
			throw new McpUserError('Organization not found or inaccessible.');
		}

		const normalizedTerms = terms?.toLocaleLowerCase();
		const matchingUsers = (await getMembers(organizationGuid))
			.flatMap(({ enabled, firstName, id, lastName }): UserName[] => {
				const name = [firstName, lastName].filter(Boolean).join(' ').trim();
				return enabled && name ? [{ guid: id, name }] : [];
			})
			.filter(({ name }) => !normalizedTerms || name.toLocaleLowerCase().includes(normalizedTerms))
			.toSorted((left, right) =>
				left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
			);
		const users = matchingUsers.slice(offset, offset + limit);

		return {
			nextOffset: offset + users.length < matchingUsers.length ? offset + users.length : null,
			users
		};
	};
}
