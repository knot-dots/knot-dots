import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyContainer,
	isActualDataContainer,
	isIndicatorTemplateContainer,
	modifiedContainer,
	predicates,
	status,
	visibility
} from '$lib/models';
import {
	deleteContainer,
	getAllContainersRelatedToIndicatorTemplates,
	getManyContainers,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';

const schema = z.object({
	deleted: z.boolean().optional(),
	guid: z.array(z.uuid()).min(1),
	organization: z.uuid(),
	organizational_unit: z.uuid().nullable(),
	payload: z
		.strictObject({
			status: status.optional(),
			visibility: visibility.optional()
		})
		.optional()
});

export const POST = (async ({ locals, request }) => {
	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});

	const parseResult = schema.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const ability = defineAbilityFor(locals.user);

	const affectedContainers = await locals.pool.transaction(async (txConnection) => {
		const containers = await getManyContainers(
			[],
			{ guid: parseResult.data.guid },
			''
		)(txConnection);

		const relatedContainers = await getAllContainersRelatedToIndicatorTemplates(
			containers.filter(isIndicatorTemplateContainer),
			{},
			{
				organizations: [parseResult.data.organization],
				organizationalUnits: parseResult.data.organizational_unit
					? [parseResult.data.organizational_unit]
					: null
			}
		)(txConnection);

		const result = [] as AnyContainer[];

		for (const container of [...containers, ...relatedContainers.filter(isActualDataContainer)]) {
			const user = [
				...container.user.filter(({ predicate }) => predicate != predicates.enum['is-creator-of']),
				{
					predicate: predicates.enum['is-creator-of'],
					subject: locals.user.guid
				}
			];

			if (parseResult.data.deleted && ability.can('delete', container)) {
				await deleteContainer({ ...container, user })(txConnection);
				result.push(container);
			} else if (parseResult.data.payload && ability.can('update', container)) {
				const updatedContainer = await updateContainer(
					modifiedContainer.parse({
						...container,
						payload: { ...container.payload, ...parseResult.data.payload },
						user
					})
				)(txConnection);
				result.push(updatedContainer as AnyContainer);
			}
		}

		return result;
	});

	return json(affectedContainers);
}) satisfies RequestHandler;
