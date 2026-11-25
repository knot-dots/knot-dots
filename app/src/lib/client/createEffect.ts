import { z } from 'zod';
import { env } from '$env/dynamic/public';
import {
	type CreateEffectRequest,
	type CreatedEffect,
	newEffectContainers
} from '$lib/effectCreation';
import {
	binaryIndicatorPayload,
	type Container,
	createContainerSchema,
	effectPayload,
	type GoalPayload,
	indicatorPayload,
	type MeasurePayload,
	newContainer
} from '$lib/models';
import { lastCreatedContainers } from '$lib/stores';

const effectContainer = createContainerSchema(effectPayload);

// The batch is answered with the created containers in the order they were sent.
const createdWithNewIndicator = z
	.tuple([
		z.union([
			createContainerSchema(indicatorPayload),
			createContainerSchema(binaryIndicatorPayload)
		]),
		effectContainer
	])
	.transform(([indicator, effect]) => ({ effect, indicator }));

const createdForExistingIndicator = z.tuple([effectContainer]);

export class CreateEffectError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'CreateEffectError';
	}
}

export default async function createEffect(
	target: Container<GoalPayload | MeasurePayload>,
	request: CreateEffectRequest
): Promise<CreatedEffect> {
	const containers = newEffectContainers(target, request).map((container) =>
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
		throw new CreateEffectError(response.status, message ?? response.statusText);
	}

	const body = await response.json();
	let created: CreatedEffect;
	if (request.indicator.kind === 'new') {
		created = createdWithNewIndicator.parse(body);
	} else {
		const [effect] = createdForExistingIndicator.parse(body);
		const indicator = request.indicator.container;
		// The indicator was loaded before the effect existed, but cards find the
		// indicator of an effect through the relations of both.
		created = {
			effect,
			indicator: {
				...indicator,
				relation: [
					...indicator.relation,
					...effect.relation.filter(({ object }) => object === indicator.guid)
				]
			}
		};
	}

	lastCreatedContainers.update(
		(map) =>
			new Map([
				...map,
				[created.effect.guid, created.effect],
				...(request.indicator.kind === 'new'
					? [[created.indicator.guid, created.indicator] as const]
					: [])
			])
	);

	return created;
}
