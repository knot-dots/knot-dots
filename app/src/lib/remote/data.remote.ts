import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { filterVisible } from '$lib/authorization';
import { isIndicatorContainer, isOrganizationalUnitContainer, payloadTypes } from '$lib/models';
import { hasSection } from '$lib/relations';
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

			relatedContainers = [
				...containersRelatedToProgram.filter(({ guid }) =>
					containersRelatedToIndicator.some(
						({ guid: relatedContainerGuid }) => relatedContainerGuid === guid
					)
				),
				...hasSection(container, containersRelatedToIndicator)
			];
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
		const [actualDataContainers, sectionContainers] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					[params.organization],
					{
						indicator: guid,
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
