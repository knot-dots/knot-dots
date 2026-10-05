import type { DatabaseConnection } from 'slonik';
import {
	containerOfType,
	getPayloadSchema,
	isBinaryIndicatorContainer,
	isContainerWithEffect,
	isContainerWithObjective,
	isIndicatorTemplateContainer,
	payloadTypes,
	predicates,
	type AnyPayload,
	type Container,
	type NewContainer
} from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	attachIndicatorToolName,
	type AttachIndicatorInput,
	type AttachIndicatorOutput
} from '$lib/server/mcp/contracts/indicators';
import { createAndRecordContainer, findVisibleContainer } from '$lib/server/mcp/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';

export class McpIndicatorError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpIndicatorError';
	}
}

function isTemplate(container: Container<AnyPayload>) {
	return 'template' in container.payload && container.payload.template === true;
}

// Like the web application, an indicator measures a measure through an effect
// and a goal through an objective: the effect or objective is part of the
// target and is measured by, or is the objective for, the indicator.
function linkFor(target: Container<AnyPayload>) {
	if (isContainerWithEffect(target)) {
		return { predicate: predicates.enum['is-measured-by'], type: payloadTypes.enum.effect };
	}
	if (isContainerWithObjective(target)) {
		return { predicate: predicates.enum['is-objective-for'], type: payloadTypes.enum.objective };
	}
	return undefined;
}

export function attachMcpIndicator(input: AttachIndicatorInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<AttachIndicatorOutput> =>
		runAsRequestUser(input.userId, async () => {
			const user = await loadMcpUserContext(connection, input.userId);
			const target = await findVisibleContainer(connection, user, input.targetGuid);
			const link = target ? linkFor(target) : undefined;
			if (!target || !link) {
				throw new McpIndicatorError(
					'Target not found or inaccessible; it must be a measure, simple measure or goal.'
				);
			}
			if (isTemplate(target)) {
				throw new McpIndicatorError(
					'The target is marked as a template (template: true); indicators cannot be attached to it.'
				);
			}
			const indicator = await findVisibleContainer(connection, user, input.indicatorGuid);
			if (
				!indicator ||
				!(isIndicatorTemplateContainer(indicator) || isBinaryIndicatorContainer(indicator))
			) {
				throw new McpIndicatorError(
					'Indicator not found or inaccessible; it must be an indicator template or a binary indicator.'
				);
			}
			if (isTemplate(indicator)) {
				throw new McpIndicatorError(
					'The indicator is marked as a template (template: true) and cannot be attached.'
				);
			}

			// The target carries the relations of its parts, so existing effects or
			// objectives are found among the containers that are part of it.
			const partGuids = target.relation
				.filter(
					({ object, predicate }) =>
						object === target.guid && predicate === predicates.enum['is-part-of']
				)
				.map(({ subject }) => subject);
			const parts =
				partGuids.length > 0
					? await getManyContainers([], { guid: partGuids }, 'alpha')(connection)
					: [];
			const existing = parts.find(
				(part) =>
					part.payload.type === link.type &&
					part.relation.some(
						({ object, predicate, subject }) =>
							subject === part.guid && object === indicator.guid && predicate === link.predicate
					)
			);
			if (existing) {
				return {
					attachment: {
						guid: existing.guid,
						indicatorGuid: indicator.guid,
						targetGuid: target.guid,
						type: link.type
					},
					changed: false
				};
			}

			const candidate = {
				...containerOfType(link.type, target),
				managed_by: target.managed_by
			} as NewContainer;
			candidate.payload = getPayloadSchema(link.type).parse({
				title: indicator.payload.title,
				type: link.type,
				...(input.iooiType ? { iooiType: input.iooiType } : undefined)
			});
			candidate.relation = [
				{ object: indicator.guid, position: 0, predicate: link.predicate },
				{ object: target.guid, position: 0, predicate: predicates.enum['is-part-of'] }
			];

			const created = await createAndRecordContainer({
				auth: input,
				data: candidate,
				tool: attachIndicatorToolName,
				user
			})(connection);

			return {
				attachment: {
					guid: created.guid,
					indicatorGuid: indicator.guid,
					targetGuid: target.guid,
					type: link.type
				},
				changed: true
			};
		});
}
