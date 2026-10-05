import type { DatabaseConnection } from 'slonik';
import {
	containerOfType,
	getPayloadSchema,
	isActualDataContainer,
	isBinaryIndicatorContainer,
	isIndicatorTemplateContainer,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	payloadTypes,
	predicates,
	type ActualDataPayload,
	type AnyPayload,
	type Container,
	type NewContainer
} from '$lib/models';
import { authorizeContainerUpdate, ContainerUpdateError } from '$lib/server/containerUpdate';
import {
	ContainerRevisionConflictError,
	getManyContainers,
	recordMcpWriteEvent,
	updateContainer
} from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	setActualDataToolName,
	type SetActualDataInput,
	type SetActualDataOutput
} from '$lib/server/mcp/contracts/actualData';
import { createAndRecordContainer, findVisibleContainer } from '$lib/server/mcp/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';
import type { User } from '$lib/stores';

export class McpActualDataError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpActualDataError';
	}
}

const scopeNotFound = 'Organization or organizational unit not found or inaccessible.';

async function findScope(
	connection: DatabaseConnection,
	user: User,
	{ organizationGuid, organizationalUnitGuid }: SetActualDataInput
) {
	const organization = await findVisibleContainer(connection, user, organizationGuid);
	if (!organization || !isOrganizationContainer(organization)) {
		throw new McpActualDataError(scopeNotFound);
	}
	if (!organizationalUnitGuid) {
		return organization;
	}
	const organizationalUnit = await findVisibleContainer(connection, user, organizationalUnitGuid);
	if (
		!organizationalUnit ||
		!isOrganizationalUnitContainer(organizationalUnit) ||
		organizationalUnit.organization !== organization.guid
	) {
		throw new McpActualDataError(scopeNotFound);
	}
	return organizationalUnit;
}

// A given year replaces its stored value; the other years are kept.
function mergeValues(stored: ActualDataPayload['values'], given: SetActualDataInput['values']) {
	const byYear = new Map(stored);
	for (const { value, year } of given) {
		byYear.set(year, value);
	}
	return [...byYear.entries()].toSorted(([a], [b]) => a - b);
}

function serialize(container: Container<ActualDataPayload>, created: boolean): SetActualDataOutput {
	return {
		actualData: {
			booleanValue: container.payload.booleanValue,
			guid: container.guid,
			indicatorGuid: container.payload.indicator,
			organizationGuid: container.organization,
			organizationalUnitGuid: container.organizational_unit,
			source: container.payload.source ?? null,
			values: container.payload.values.map(([year, value]) => ({ value, year }))
		},
		created
	};
}

// Like the indicator table of the web application, an organization or
// organizational unit records the actual values of an indicator in one
// actual_data container, which names the indicator in its payload.
export function setMcpActualData(input: SetActualDataInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<SetActualDataOutput> =>
		runAsRequestUser(input.userId, async () => {
			const user = await loadMcpUserContext(connection, input.userId);
			const scope = await findScope(connection, user, input);

			const indicator = await findVisibleContainer(connection, user, input.indicatorGuid);
			if (
				!indicator ||
				!(isIndicatorTemplateContainer(indicator) || isBinaryIndicatorContainer(indicator)) ||
				('template' in indicator.payload && indicator.payload.template === true)
			) {
				throw new McpActualDataError(
					'Indicator not found or inaccessible; it must be an indicator template or a binary indicator.'
				);
			}
			if (isIndicatorTemplateContainer(indicator) && input.booleanValue !== undefined) {
				throw new McpActualDataError(
					'booleanValue is only for binary indicators; pass values by year.'
				);
			}
			if (isBinaryIndicatorContainer(indicator) && input.values.length > 0) {
				throw new McpActualDataError(
					'A binary indicator has no values by year; pass booleanValue.'
				);
			}

			const [existing] = (
				await getManyContainers(
					[scope.organization],
					{
						indicators: [indicator.guid],
						organizationalUnits: isOrganizationalUnitContainer(scope) ? [scope.guid] : null,
						type: [payloadTypes.enum.actual_data]
					},
					'alpha'
				)(connection)
			).filter(
				(c): c is Container<ActualDataPayload> =>
					isActualDataContainer(c) && c.payload.indicator === indicator.guid
			);

			if (!existing) {
				const candidate = containerOfType(payloadTypes.enum.actual_data, scope) as NewContainer;
				candidate.payload = getPayloadSchema(payloadTypes.enum.actual_data).parse({
					booleanValue: input.booleanValue ?? false,
					indicator: indicator.guid,
					...(input.source ? { source: input.source } : undefined),
					title: indicator.payload.title,
					type: payloadTypes.enum.actual_data,
					values: mergeValues([], input.values)
				});
				const created = await createAndRecordContainer({
					auth: input,
					data: candidate,
					tool: setActualDataToolName,
					user
				})(connection);
				return serialize(created as Container<ActualDataPayload>, true);
			}

			const payload: ActualDataPayload = {
				...existing.payload,
				booleanValue: input.booleanValue ?? existing.payload.booleanValue,
				...(input.source ? { source: input.source } : undefined),
				values: mergeValues(existing.payload.values, input.values)
			};
			let authorized: AnyPayload;
			try {
				authorized = authorizeContainerUpdate({
					current: existing,
					next: { ...existing, payload },
					user
				});
			} catch (error) {
				if (error instanceof ContainerUpdateError) {
					throw new McpActualDataError(
						'You are not allowed to change the actual values of this indicator here.'
					);
				}
				throw error;
			}

			try {
				const updated = await updateContainer(
					{
						...existing,
						payload: authorized,
						user: [
							...existing.user.filter(
								({ predicate }) => predicate !== predicates.enum['is-creator-of']
							),
							{ predicate: predicates.enum['is-creator-of'], subject: user.guid }
						]
					},
					{
						afterUpdate: (container, txConnection) =>
							recordMcpWriteEvent({
								containerGuid: container.guid,
								revision: container.revision,
								tokenId: input.tokenId,
								tool: setActualDataToolName,
								userId: input.userId
							})(txConnection),
						expectedRevision: existing.revision
					}
				)(connection);
				return serialize(updated as Container<ActualDataPayload>, false);
			} catch (error) {
				if (error instanceof ContainerRevisionConflictError) {
					throw new McpActualDataError(
						'The actual values were changed at the same time; call set_actual_data again.'
					);
				}
				throw error;
			}
		});
}
