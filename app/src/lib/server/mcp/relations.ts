import type { DatabaseConnection } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import type { AnyPayload, Container, Relation } from '$lib/models';
import { authorizeContainerRelationChanges } from '$lib/server/containerRelations';
import {
	changeManyContainerRelations,
	getManyContainers,
	recordMcpWriteEvent
} from '$lib/server/db';
import { getFeatures } from '$lib/server/features';
import type { McpAuth } from '$lib/server/mcp/auth';
import { summarizeContainer } from '$lib/server/mcp/containers';
import { mcpPayloadTypes } from '$lib/server/mcp/contracts/payloads';
import {
	addContainerRelationToolName,
	removeContainerRelationToolName,
	symmetricMcpRelationPredicates,
	type ContainerRelationChangeInput,
	type ContainerRelationChangeOutput,
	type ListContainerRelationsInput,
	type ListContainerRelationsOutput
} from '$lib/server/mcp/contracts/relations';
import { findVisibleContainer } from '$lib/server/mcp/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';
import type { User } from '$lib/stores';

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

async function findRelatableContainer(
	connection: DatabaseConnection,
	user: User,
	guid: string,
	role: 'Object' | 'Subject'
) {
	const container = await findVisibleContainer(connection, user, guid);
	if (!container || !mcpPayloadTypes.safeParse(container.payload.type).success) {
		throw new McpRelationError(`${role} container not found or inaccessible.`);
	}
	if ('template' in container.payload && container.payload.template === true) {
		throw new McpRelationError('Templates cannot be related by this tool.');
	}
	return container;
}

function serializeRelation({ object, predicate, subject }: Relation) {
	return { objectGuid: object, predicate, subjectGuid: subject };
}

// Adds or removes one semantic relation. Both containers must be visible, of a
// type exposed through MCP and in the same organization; the change is
// authorized like a change through either container in the web application.
// Nothing is written if the relation already has the requested state.
function changeMcpContainerRelation(
	action: 'add' | 'remove',
	{ objectGuid, predicate, subjectGuid, tokenId, userId }: ContainerRelationChangeInput & McpAuth
) {
	return (connection: DatabaseConnection): Promise<ContainerRelationChangeOutput> =>
		runAsRequestUser(userId, async () => {
			if (subjectGuid === objectGuid) {
				throw new McpRelationError('A container cannot be related to itself.');
			}
			const user = await loadMcpUserContext(connection, userId);
			const subject = await findRelatableContainer(connection, user, subjectGuid, 'Subject');
			const object = await findRelatableContainer(connection, user, objectGuid, 'Object');
			if (subject.organization !== object.organization) {
				throw new McpRelationError('Both containers must belong to the same organization.');
			}

			const symmetric = symmetricMcpRelationPredicates.has(predicate);
			// The subject carries its relations in both directions.
			const existing = subject.relation.filter(
				(r) =>
					r.predicate === predicate &&
					((r.subject === subjectGuid && r.object === objectGuid) ||
						(symmetric && r.subject === objectGuid && r.object === subjectGuid))
			);
			const requested: Relation = {
				object: objectGuid,
				position: 0,
				predicate,
				subject: subjectGuid
			};
			if (action === 'add' ? existing.length > 0 : existing.length === 0) {
				return { changed: false, relation: serializeRelation(existing[0] ?? requested) };
			}

			const changes =
				action === 'add'
					? [{ ...requested, deleted: false }]
					: existing.map((r) => ({ ...r, deleted: true }));
			const containers: Container<AnyPayload>[] = [subject, object];
			const features = getFeatures();
			const authorized = [subjectGuid, objectGuid].some(
				(guid) =>
					authorizeContainerRelationChanges({ changes, containers, features, guid, user }).rejected
						.length === 0
			);
			if (!authorized) {
				throw new McpRelationError(
					'You are not allowed to change the relations of these containers.'
				);
			}

			const tool =
				action === 'add' ? addContainerRelationToolName : removeContainerRelationToolName;
			await changeManyContainerRelations(
				action === 'add' ? { removed: [], upserted: changes } : { removed: changes, upserted: [] },
				{
					afterChange: async (txConnection) => {
						for (const change of changes) {
							await recordMcpWriteEvent({
								containerGuid: change.subject,
								relation: { predicate: change.predicate, relatedContainerGuid: change.object },
								revision: null,
								tokenId,
								tool,
								userId
							})(txConnection);
						}
					}
				}
			)(connection);

			return { changed: true, relation: serializeRelation(changes[0]) };
		});
}

export function addMcpContainerRelation(input: ContainerRelationChangeInput & McpAuth) {
	return changeMcpContainerRelation('add', input);
}

export function removeMcpContainerRelation(input: ContainerRelationChangeInput & McpAuth) {
	return changeMcpContainerRelation('remove', input);
}
