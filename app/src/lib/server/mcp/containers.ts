import { NotFoundError, type DatabaseConnection } from 'slonik';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import type { AnyPayload, Container } from '$lib/models';
import { getContainerByGuid } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import type {
	ContainerSummary,
	SearchContainersInput,
	SearchContainersOutput
} from '$lib/server/mcp/contracts/containers';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import type { User } from '$lib/stores';

const searchBatchSize = 250;

export interface SearchMcpContainersOptions extends SearchContainersInput {
	user: User;
}

function summarizeContainer(container: Container<AnyPayload>): ContainerSummary {
	const { payload } = container;
	const label = 'title' in payload ? payload.title : 'name' in payload ? payload.name : null;

	return {
		guid: container.guid,
		label: typeof label === 'string' ? label : null,
		organizationGuid: container.organization,
		organizationalUnitGuid: container.organizational_unit,
		status: 'status' in payload ? payload.status : null,
		summary: 'summary' in payload && typeof payload.summary === 'string' ? payload.summary : null,
		type: payload.type
	};
}

export async function searchMcpContainers({
	assigneeGuids,
	limit,
	offset,
	organizationGuid,
	organizationalUnitGuid,
	statuses,
	terms,
	types,
	user
}: SearchMcpContainersOptions): Promise<SearchContainersOutput> {
	const visibleContainers: Container<AnyPayload>[] = [];
	let rawOffset = 0;
	let total = Number.POSITIVE_INFINITY;

	while (visibleContainers.length < offset + limit + 1 && rawOffset < total) {
		const result = await getManyContainersWithES(
			[organizationGuid],
			{
				assignees: assigneeGuids,
				organizationalUnits:
					organizationalUnitGuid === undefined
						? undefined
						: organizationalUnitGuid === null
							? null
							: [organizationalUnitGuid],
				statuses,
				template: false,
				terms,
				type: types
			},
			terms ? 'relevance' : 'alpha',
			{ includeFacets: false, limit: searchBatchSize, offset: rawOffset }
		);

		total = result.total;
		visibleContainers.push(...filterVisible(result.containers, user));
		rawOffset += result.containers.length;

		if (result.containers.length === 0) {
			break;
		}
	}

	const visiblePage = visibleContainers.slice(offset, offset + limit + 1);
	const hasNextPage = visiblePage.length > limit;

	return {
		containers: visiblePage.slice(0, limit).map(summarizeContainer),
		nextOffset: hasNextPage ? offset + limit : null
	};
}

export function getMcpContainer({ guid, userId }: { guid: string; userId: string }) {
	return async (connection: DatabaseConnection): Promise<Container<AnyPayload> | null> => {
		const user = await loadMcpUserContext(connection, userId);

		try {
			const container = await getContainerByGuid(guid)(connection);
			return defineAbilityFor(user).can('read', container) ? container : null;
		} catch (error) {
			if (error instanceof NotFoundError) {
				return null;
			}
			throw error;
		}
	};
}
