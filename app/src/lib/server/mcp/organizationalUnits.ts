import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import { getManyOrganizationalUnitContainers } from '$lib/server/db';
import type {
	ListOrganizationalUnitsInput,
	ListOrganizationalUnitsOutput
} from '$lib/server/mcp/contracts/organizationalUnits';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';

export interface ListMcpOrganizationalUnitsOptions extends ListOrganizationalUnitsInput {
	userId: string;
}

export function listMcpOrganizationalUnits({
	limit,
	offset,
	organizationGuid,
	userId
}: ListMcpOrganizationalUnitsOptions) {
	return async (connection: DatabaseConnection): Promise<ListOrganizationalUnitsOutput> => {
		const user = await loadMcpUserContext(connection, userId);
		const containers = await runAsRequestUser(user.guid, () =>
			getManyOrganizationalUnitContainers({
				include: { organization: organizationGuid }
			})(connection)
		);
		const visiblePage = filterVisible(containers, user).slice(offset, offset + limit + 1);
		const hasNextPage = visiblePage.length > limit;

		return {
			nextOffset: hasNextPage ? offset + limit : null,
			organizationalUnits: visiblePage.slice(0, limit).map(({ guid, organization, payload }) => ({
				guid,
				level: payload.level,
				name: payload.name,
				organizationGuid: organization,
				slug: payload.slug ?? null
			}))
		};
	};
}
