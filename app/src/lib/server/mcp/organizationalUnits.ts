import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import type { OrganizationalUnitSummary } from '$lib/organizationalUnitSummary';
import { getManyOrganizationalUnitContainers } from '$lib/server/db';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';

export interface ListMcpOrganizationalUnitsOptions {
	limit: number;
	offset: number;
	organizationGuid: string;
	userId: string;
}

export interface ListMcpOrganizationalUnitsResult {
	nextOffset: number | null;
	organizationalUnits: OrganizationalUnitSummary[];
}

export function listMcpOrganizationalUnits({
	limit,
	offset,
	organizationGuid,
	userId
}: ListMcpOrganizationalUnitsOptions) {
	return async (connection: DatabaseConnection): Promise<ListMcpOrganizationalUnitsResult> => {
		const user = await loadMcpUserContext(connection, userId);
		const containers = await getManyOrganizationalUnitContainers({
			include: { organization: organizationGuid }
		})(connection);
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
