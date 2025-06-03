import { type Span, trace } from '@opentelemetry/api';
import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from '../../routes/all/$types';

const tracer = trace.getTracer('app');

export default (async function load({ locals, url, parent }) {
	return tracer.startActiveSpan('page.load', async (span: Span) => {
		let containers;
		let subordinateOrganizationalUnits: string[] = [];
		const { currentOrganization, currentOrganizationalUnit } = await parent();

		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			subordinateOrganizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}

		if (url.searchParams.has('related-to')) {
			containers = await locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? [
								predicates.enum['contributes-to'],
								predicates.enum['is-consistent-with'],
								predicates.enum['is-equivalent-to'],
								predicates.enum['is-inconsistent-with'],
								predicates.enum['is-part-of']
							]
						: url.searchParams.getAll('relationType'),
					{
						type: [
							payloadTypes.enum.effect,
							payloadTypes.enum.goal,
							payloadTypes.enum.indicator,
							payloadTypes.enum.measure,
							payloadTypes.enum.simple_measure,
							payloadTypes.enum.strategy
						]
					},
					url.searchParams.get('sort') ?? ''
				)
			);
		} else if (url.searchParams.has('strategyType')) {
			containers = await locals.pool.connect(
				getAllRelatedContainersByStrategyType(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.getAll('strategyType'),
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						terms: url.searchParams.get('terms') ?? '',
						type: [
							payloadTypes.enum.effect,
							payloadTypes.enum.goal,
							payloadTypes.enum.indicator,
							payloadTypes.enum.measure,
							payloadTypes.enum.simple_measure,
							payloadTypes.enum.strategy
						]
					},
					url.searchParams.get('sort') ?? ''
				)
			);
		} else {
			containers = await locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? '',
						type: [
							payloadTypes.enum.effect,
							payloadTypes.enum.goal,
							payloadTypes.enum.indicator,
							payloadTypes.enum.measure,
							payloadTypes.enum.resolution,
							payloadTypes.enum.simple_measure,
							payloadTypes.enum.strategy
						]
					},
					url.searchParams.get('sort') ?? ''
				)
			);
		}

		span.end();

		return {
			containers: filterOrganizationalUnits(
				filterVisible(containers, locals.user),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit
			)
		};
	});
} satisfies PageServerLoad);
