import { NotFoundError, type DatabaseConnection } from 'slonik';
import { getPayloadSchema, type AnyPayload, type Container } from '$lib/models';
import { applyComputedManagedBy } from '$lib/server/computeManagedBy';
import { authorizeContainerUpdate, ContainerUpdateError } from '$lib/server/containerUpdate';
import {
	ContainerRevisionConflictError,
	recordMcpWriteEvent,
	updateContainerPayload
} from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { mcpPayloadTypes } from '$lib/server/mcp/contracts/payloads';
import {
	updateContainerToolName,
	type UpdateContainerInput
} from '$lib/server/mcp/contracts/update';
import { findVisibleContainer, payloadValidationMessage } from '$lib/server/mcp/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';

export class McpUpdateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpUpdateError';
	}
}

const notFound = 'Container not found or inaccessible.';

function conflict(revision: number) {
	return new McpUpdateError(
		`The container changed since revision ${revision}. Read it again with get_container and retry.`
	);
}

function isTemplate(payload: Record<string, unknown>) {
	return payload.template === true;
}

function mergePayloadPatch(payload: AnyPayload, patch: Record<string, unknown>) {
	const merged: Record<string, unknown> = { ...payload };
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) {
			delete merged[key];
		} else {
			merged[key] = value;
		}
	}
	return merged;
}

export function updateMcpContainer(input: UpdateContainerInput & McpAuth) {
	return async (connection: DatabaseConnection): Promise<Container<AnyPayload>> => {
		const user = await loadMcpUserContext(connection, input.userId);
		const current = await findVisibleContainer(connection, user, input.guid);
		if (!current || !mcpPayloadTypes.safeParse(current.payload.type).success) {
			throw new McpUpdateError(notFound);
		}
		if ('type' in input.payloadPatch && input.payloadPatch.type !== current.payload.type) {
			throw new McpUpdateError('The payload type cannot be changed.');
		}
		if (current.revision !== input.expectedRevision) {
			throw conflict(input.expectedRevision);
		}

		const merged = mergePayloadPatch(current.payload, input.payloadPatch);
		if (isTemplate(current.payload) || isTemplate(merged)) {
			throw new McpUpdateError('Templates cannot be updated by this tool.');
		}
		const payloadResult = getPayloadSchema(current.payload.type).safeParse(merged);
		if (!payloadResult.success) {
			throw new McpUpdateError(payloadValidationMessage(payloadResult.error));
		}

		let payload: AnyPayload;
		try {
			payload = authorizeContainerUpdate({
				current,
				next: { ...current, payload: payloadResult.data },
				user
			});
		} catch (error) {
			if (error instanceof ContainerUpdateError) {
				throw new McpUpdateError(
					error.kind === 'forbidden'
						? 'You are not allowed to update this container.'
						: 'This change is not allowed for this container.'
				);
			}
			throw error;
		}

		let updated: Container<AnyPayload>;
		try {
			updated = await updateContainerPayload(
				{
					editorGuid: user.guid,
					expectedRevision: input.expectedRevision,
					guid: current.guid,
					payload
				},
				{
					afterUpdate: (container, txConnection) =>
						recordMcpWriteEvent({
							containerGuid: container.guid,
							revision: container.revision,
							tokenId: input.tokenId,
							tool: updateContainerToolName,
							userId: input.userId
						})(txConnection)
				}
			)(connection);
		} catch (error) {
			if (error instanceof ContainerRevisionConflictError) throw conflict(input.expectedRevision);
			if (error instanceof NotFoundError) throw new McpUpdateError(notFound);
			throw error;
		}

		// Match the view get_container returns.
		const [withComputed] = await applyComputedManagedBy(connection, [updated]);
		return withComputed;
	};
}
