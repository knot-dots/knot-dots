import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { filterVisible } from '$lib/authorization';
import { isIndicatorContainer, isOrganizationalUnitContainer, payloadTypes } from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers
} from '$lib/server/db';

export const fetchContainersRelatedToIndicators = query(
	z.object({
		guid: z.string().uuid(),
		params: z.object({
			organization: z.array(z.string().uuid()),
			organizationalUnit: z.string().uuid().optional(),
			program: z.string().uuid().optional()
		})
	}),
	async ({ guid, params }) => {
		const { locals } = getRequestEvent();

		let relatedContainers;

		const container = await locals.pool.connect(getContainerByGuid(guid));

		if (!isIndicatorContainer(container)) {
			error(404, unwrapFunctionStore(_)('error.not_found'));
		}

		if (params.program) {
			const [containersRelatedToProgram, containersRelatedToIndicator] = await Promise.all([
				locals.pool.connect(getAllContainersRelatedToProgram(params.program, {})),
				locals.pool.connect(getAllContainersRelatedToIndicators([container], {}))
			]);

			relatedContainers = containersRelatedToProgram.filter(({ guid }) =>
				containersRelatedToIndicator.some(
					({ guid: relatedContainerGuid }) => relatedContainerGuid === guid
				)
			);
		} else {
			let subordinateOrganizationalUnits: string[] = [];

			if (params.organizationalUnit) {
				const currentOrganizationalUnit = await locals.pool.connect(
					getContainerByGuid(params.organizationalUnit)
				);

				if (!isOrganizationalUnitContainer(currentOrganizationalUnit)) {
					error(404, unwrapFunctionStore(_)('error.not_found'));
				}

				const relatedOrganizationalUnits = await locals.pool.connect(
					getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
				);
				subordinateOrganizationalUnits = relatedOrganizationalUnits
					.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
					.map(({ guid }) => guid)
					.concat(currentOrganizationalUnit.guid);
			}

			relatedContainers = await locals.pool.connect(
				getAllContainersRelatedToIndicators([container], {
					organizationalUnits: subordinateOrganizationalUnits
				})
			);
		}

		return filterVisible(relatedContainers, locals.user);
	}
);

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
		const relatedContainers = await locals.pool.connect(
			getManyContainers(
				[params.organization],
				{
					indicator: guid,
					organizationalUnits: params.organizationalUnit ? [params.organizationalUnit] : [],
					type: [payloadTypes.enum.actual_data]
				},
				'alpha'
			)
		);
		return filterVisible(relatedContainers, locals.user);
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
			audience: z.array(z.string()),
			sdg: z.array(z.string()),
			policyFieldBNK: z.array(z.string()),
			terms: z.string().optional(),
			topic: z.array(z.string())
		})
	}),
	async ({ guid, params }) => {
		const { locals } = getRequestEvent();
		const relatedContainers = await locals.pool.connect(
			getAllContainersRelatedToProgram(guid, {
				audience: params.audience,
				sdg: params.sdg,
				policyFieldsBNK: params.policyFieldBNK,
				...(params.terms ? { terms: params.terms } : undefined),
				topics: params.topic
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

		const [related, resourceData] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainers(params.organization, guid, params.relationType, {}, 'alpha')
			),
			locals.pool.connect(
				getManyContainers(
					[],
					{
						type: [payloadTypes.enum.resource_data],
						resource: [guid]
					},
					'alpha'
				)
			)
		]);

		const merged = [
			...related,
			...resourceData.filter(
				(r) => !related.some((existing: { guid: string }) => existing.guid === r.guid)
			)
		];

		return filterVisible(merged, locals.user);
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
