import type { DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import { getManyContainers } from '$lib/server/db';
import { summarizeContainer } from '$lib/server/mcp/containers';
import type {
	ListContainerRelationsInput,
	ListContainerRelationsOutput
} from '$lib/server/mcp/contracts/relations';
import { findVisibleContainer } from '$lib/server/mcp/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';

export class McpRelationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpRelationError';
	}
}

const notFound = 'Container not found or inaccessible.';

// Lists the direct relations of a visible container. Relations to containers
// the user may not read are left out, so paging counts visible relations only.
export function listMcpContainerRelations({
	guid,
	limit,
	offset,
	predicates,
	userId
}: ListContainerRelationsInput & { userId: string }) {
	return (connection: DatabaseConnection): Promise<ListContainerRelationsOutput> =>
		runAsRequestUser(userId, async () => {
			const user = await loadMcpUserContext(connection, userId);
			const container = await findVisibleContainer(connection, user, guid);
			if (!container) {
				throw new McpRelationError(notFound);
			}

			const relations = container.relation.filter(
				({ predicate }) => predicates.length === 0 || predicates.some((p) => p === predicate)
			);
			const otherGuids = [
				...new Set(relations.map(({ object, subject }) => (subject === guid ? object : subject)))
			];
			const ability = defineAbilityFor(user);
			const others =
				otherGuids.length > 0
					? await getManyContainers([], { guid: otherGuids }, 'alpha')(connection)
					: [];
			const visibleOthers = new Map(
				others.filter((other) => ability.can('read', other)).map((other) => [other.guid, other])
			);

			const listed = relations.flatMap(({ object, position, predicate, subject }) => {
				const outgoing = subject === guid;
				const other = visibleOthers.get(outgoing ? object : subject);
				return other
					? [
							{
								container: summarizeContainer(other),
								direction: outgoing ? ('outgoing' as const) : ('incoming' as const),
								position,
								predicate
							}
						]
					: [];
			});
			const page = listed.slice(offset, offset + limit);

			return {
				nextOffset: offset + page.length < listed.length ? offset + page.length : null,
				relations: page
			};
		});
}
