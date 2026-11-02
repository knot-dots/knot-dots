import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { type NewContainer, newContainer, payloadTypes } from '$lib/models';
import { authorizeNewContainer, containerCreationHttpError } from '$lib/server/containerCreation';
import type { NewContainerWithGuid } from '$lib/server/containerCopyPlan';
import { createManyContainers, getContainerByGuid } from '$lib/server/db';
import { enqueueIndexingEvents } from '$lib/server/indexingQueue';
import type { RequestHandler } from './$types';

// Keeps a single request from holding a transaction for long.
const maxBatchSize = 20;

const batch = z
	.array(newContainer.required({ guid: true }))
	.min(1)
	.max(maxBatchSize);

// Relations without an end refer to the container itself, as with createContainer.
function withGuid(container: NewContainer, guid: string): NewContainerWithGuid {
	return {
		...container,
		guid,
		relation: container.relation.map((r) => ({
			...r,
			object: r.object ?? guid,
			subject: r.subject ?? guid
		}))
	};
}

// Creates several containers that may refer to each other by their guids, such
// as an effect and the new indicator it is measured by. Each brings its own
// guid. All of them are inserted in one transaction and only indexed once it
// has been committed. The created containers are returned in the order they
// were sent.
export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('content-type')?.split(';', 1)[0].trim() !== 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch(() => {
		error(400, { message: unwrapFunctionStore(_)('error.bad_request') });
	});

	const parseResult = batch.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	// Guids must be unique. Organizations provision a group in Keycloak, so they
	// are created one at a time.
	const guids = parseResult.data.map(({ guid }) => guid);
	if (
		new Set(guids).size !== guids.length ||
		parseResult.data.some(({ payload }) => payload.type === payloadTypes.enum.organization)
	) {
		error(422, { message: unwrapFunctionStore(_)('error.bad_request') });
	}

	// Each relation may be declared once; one without an end refers to the
	// container itself.
	const relations = parseResult.data.flatMap(({ guid, relation }) =>
		relation.map(
			({ object, predicate, subject }) => `${subject ?? guid} ${predicate} ${object ?? guid}`
		)
	);
	if (new Set(relations).size !== relations.length) {
		error(422, { message: unwrapFunctionStore(_)('error.bad_request') });
	}

	const pending = new Set(guids);
	const features = locals.features ?? [];

	try {
		const { affectedIndexingGuids } = await locals.pool.transaction(async (connection) => {
			const inserts: NewContainerWithGuid[] = [];
			for (const container of parseResult.data) {
				const authorized = await authorizeNewContainer({
					data: container,
					features,
					pending,
					user: locals.user
				})(connection);
				inserts.push(withGuid(authorized, container.guid));
			}

			return createManyContainers(inserts)(connection);
		});

		const timestamp = new Date().toISOString();
		await enqueueIndexingEvents(
			affectedIndexingGuids.map((guid) => ({ action: 'upsert', guid, timestamp }))
		);

		// Read again to carry the grants of the user, like any read result.
		const created = await locals.pool.connect((connection) =>
			Promise.all(guids.map((guid) => getContainerByGuid(guid)(connection)))
		);

		return json(created, { status: 201 });
	} catch (caught: unknown) {
		containerCreationHttpError(caught);
	}
}) satisfies RequestHandler;
