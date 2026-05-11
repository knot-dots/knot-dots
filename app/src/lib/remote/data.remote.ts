import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { filterVisible } from '$lib/authorization';
import { payloadTypes } from '$lib/models';
import {
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getManyContainers
} from '$lib/server/db';

export const fetchContainersRelatedToIndicatorTemplates = query(
	z.object({
		guid: z.string().uuid(),
		params: z.object({
			organization: z.string().uuid(),
			organizationalUnit: z.string().uuid().optional()
		})
	}),
	async ({ guid, params }) => {
		const { locals } = getRequestEvent();
		const [actualDataContainers, sectionContainers] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					[params.organization],
					{
						indicators: [guid],
						organizationalUnits: params.organizationalUnit ? [params.organizationalUnit] : [],
						type: [payloadTypes.enum.actual_data]
					},
					'alpha'
				)
			),
			locals.pool.connect(
				getAllRelatedContainers([params.organization], guid, ['is-section-of'], {}, 'alpha')
			)
		]);
		return filterVisible([...actualDataContainers, ...sectionContainers], locals.user);
	}
);

export const fetchContainersRelatedToMeasure = query(z.string().uuid(), async (guid) => {
	const { locals } = getRequestEvent();
	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToMeasure(guid, {}, 'alpha')
	);
	return filterVisible(relatedContainers, locals.user);
});

export const fetchContainersRelatedToProgram = query(
	z.object({
		guid: z.string().uuid(),
		params: z.object({
			customCategories: z.record(z.string(), z.array(z.string())).optional(),
			terms: z.string().optional()
		})
	}),
	async ({ guid, params }) => {
		const { locals } = getRequestEvent();
		const relatedContainers = await locals.pool.connect(
			getAllContainersRelatedToProgram(guid, {
				customCategories: params.customCategories,
				...(params.terms ? { terms: params.terms } : undefined)
			})
		);
		return filterVisible(relatedContainers, locals.user);
	}
);

export const fetchContainersRelatedToResource = query(
	z.object({
		guid: z.uuid(),
		params: z.object({
			organization: z.array(z.uuid()),
			relationType: z.array(z.string())
		})
	}),
	async ({ guid, params }) => {
		const { locals } = getRequestEvent();

		// Fetch the resource data container(s) for the given resource GUID
		const resourceData = await locals.pool.connect(
			getManyContainers(
				[],
				{
					type: [payloadTypes.enum.resource_data],
					resource: [guid]
				},
				'alpha'
			)
		);

		// Fetch containers related to each resourceData object (e.g., Goals, Measures)
		const relatedToResourceData = await Promise.all(
			resourceData.map((rd) =>
				locals.pool.connect(
					getAllRelatedContainers(params.organization, rd.guid, params.relationType, {}, 'alpha')
				)
			)
		);

		// Flatten and deduplicate all results
		const allContainers = [...resourceData, ...relatedToResourceData.flat()];

		const uniqueContainers = Array.from(new Map(allContainers.map((c) => [c.guid, c])).values());

		return filterVisible(uniqueContainers, locals.user);
	}
);

export const fetchRelatedContainers = query(
	z.object({
		guid: z.string().uuid(),
		params: z.object({
			organization: z.array(z.string().uuid()),
			relationType: z.array(z.string())
		})
	}),
	async ({ guid, params }) => {
		const { locals } = getRequestEvent();
		const relatedContainers = await locals.pool.connect(
			getAllRelatedContainers(params.organization, guid, params.relationType, {}, 'alpha')
		);
		return filterVisible(relatedContainers, locals.user);
	}
);
