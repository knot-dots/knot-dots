import { z } from 'zod';
import { env } from '$env/dynamic/public';
import {
	type CreateObjectiveOrEffectRequest,
	type CreatedObjectiveOrEffect,
	newObjectiveOrEffectContainers
} from '$lib/objectiveOrEffectCreation';
import {
	binaryIndicatorPayload,
	type Container,
	createContainerSchema,
	effectPayload,
	type GoalPayload,
	indicatorPayload,
	type MeasurePayload,
	newContainer,
	objectivePayload,
	payloadTypes
} from '$lib/models';
import { lastCreatedContainers } from '$lib/stores';

const indicatorContainer = z.union([
	createContainerSchema(indicatorPayload),
	createContainerSchema(binaryIndicatorPayload)
]);

const itemContainers = {
	[payloadTypes.enum.effect]: createContainerSchema(effectPayload),
	[payloadTypes.enum.objective]: createContainerSchema(objectivePayload)
};

export class CreateObjectiveOrEffectError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'CreateObjectiveOrEffectError';
	}
}

export default async function createObjectiveOrEffect(
	target: Container<GoalPayload | MeasurePayload>,
	request: CreateObjectiveOrEffectRequest
): Promise<CreatedObjectiveOrEffect> {
	const containers = newObjectiveOrEffectContainers(target, request).map((container) =>
		// Drops the grants of a container built with containerOfType.
		newContainer.parse({ ...container, realm: env.PUBLIC_KC_REALM })
	);

	const response = await fetch('/container/bulk-action/create', {
		method: 'POST',
		body: JSON.stringify(containers),
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		const { message } = await response.json().catch(() => ({ message: undefined }));
		throw new CreateObjectiveOrEffectError(response.status, message ?? response.statusText);
	}

	// The batch is answered with the created containers in the order they were sent.
	const body = await response.json();
	const itemContainer = itemContainers[request.type];
	let created: CreatedObjectiveOrEffect;
	if (request.indicator.kind === 'new') {
		const [indicator, item] = z.tuple([indicatorContainer, itemContainer]).parse(body);
		created = { indicator, item };
	} else {
		const [item] = z.tuple([itemContainer]).parse(body);
		const indicator = request.indicator.container;
		// The indicator was loaded before the item existed, but cards find the
		// indicator of an objective or effect through the relations of both.
		created = {
			indicator: {
				...indicator,
				relation: [
					...indicator.relation,
					...item.relation.filter(({ object }) => object === indicator.guid)
				]
			},
			item
		};
	}

	lastCreatedContainers.update(
		(map) =>
			new Map([
				...map,
				[created.item.guid, created.item],
				...(request.indicator.kind === 'new'
					? [[created.indicator.guid, created.indicator] as const]
					: [])
			])
	);

	return created;
}
