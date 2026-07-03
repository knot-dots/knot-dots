import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyContainer,
	isActualDataContainer,
	isBinaryIndicatorContainer,
	isIndicatorTemplateContainer,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	modifiedContainer,
	predicates,
	status,
	visibility
} from '$lib/models';
import {
	deleteContainer,
	deleteContainerRecursively,
	deleteOrganizationalUnitContainer,
	deleteOrganizationContainer,
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

		// In the case of indicators, the intention of the delete action depends
		// on the context: An indicator is always owned by an organization or
		// organizational unit and can be used anywhere. If the indicator to be
		// deleted belongs to a different organizational context, only the
		// actual data should be removed. Because of the filtering rules of the
		// workspace, the associated indicator is effectively removed.
		// Therefore, the indicators belonging to other organizational contexts
		// need to be excluded from the bulk action targets.
		const isNotForeignIndicator = (container: AnyContainer) =>
			!(isIndicatorTemplateContainer(container) || isBinaryIndicatorContainer(container)) ||
			(container.organization == parseResult.data.organization &&
				container.organizational_unit == parseResult.data.organizational_unit);

		for (const container of [
			...containers.filter(isNotForeignIndicator),
			...relatedContainers.filter(isActualDataContainer)
		]) {
			const user = [
				...container.user.filter(({ predicate }) => predicate != predicates.enum['is-creator-of']),
				{
					predicate: predicates.enum['is-creator-of'],
					subject: locals.user.guid
				}
			];

			if (parseResult.data.deleted && ability.can('delete-recursively', container)) {
				await deleteContainerRecursively({ ...container, user })(txConnection);
				result.push(container);
			} else if (parseResult.data.deleted && ability.can('delete', container)) {
				if (isOrganizationContainer(container)) {
					await deleteOrganizationContainer({ ...container, user })(txConnection);
				} else if (isOrganizationalUnitContainer(container)) {
					await deleteOrganizationalUnitContainer({ ...container, user })(txConnection);
				} else {
					await deleteContainer({ ...container, user })(txConnection);
				}
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
