import { z } from 'zod';
import { getContainerOutput } from '$lib/server/mcp/contracts/containers';

export const updateContainerToolName = 'update_container';

export const updateContainerInput = z.strictObject({
	expectedRevision: z
		.number()
		.int()
		.positive()
		.describe(
			'Revision from the latest get_container, create_container or update_container response; the update fails if the container changed since. Relation changes do not create revisions.'
		),
	guid: z.uuid().describe('GUID of the container to update.'),
	payloadPatch: z
		.looseObject({})
		.refine((patch) => Object.keys(patch).length > 0, 'The patch must change at least one field.')
		.describe(
			'Top-level payload fields to change. Nested values replace the current value as a whole; null removes a field so that its default applies. The payload type cannot be changed.'
		)
});

export type UpdateContainerInput = z.infer<typeof updateContainerInput>;

export const updateContainerOutput = getContainerOutput;
