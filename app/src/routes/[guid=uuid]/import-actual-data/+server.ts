import { error } from '@sveltejs/kit';
import assert from 'node:assert';
import { type CommonQueryMethods, NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import {
	type ActualDataContainer,
	containerOfType,
	isIndicatorTemplateContainer,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	type NewContainer,
	payloadTypes
} from '$lib/models';
import {
	createContainer,
	getContainerByGuid,
	getManyContainers,
	getManyIndicatorDataWegweiserKommune,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';

function isSame<T>(a: T, b: T) {
	try {
		assert.deepEqual(a, b);
		return true;
	} catch {
		return false;
	}
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	let currentOrganizationGuid: string;
	let currentOrganizationalUnitGuid: string | undefined;
	let containerFromParams;

	try {
		containerFromParams = await locals.pool.connect(getContainerByGuid(params.guid));
		if (
			isOrganizationalUnitContainer(containerFromParams) &&
			defineAbilityFor(locals.user).can('read', containerFromParams)
		) {
			currentOrganizationalUnitGuid = containerFromParams.guid;
			currentOrganizationGuid = containerFromParams.organization;
		} else if (
			isOrganizationContainer(containerFromParams) &&
			defineAbilityFor(locals.user).can('read', containerFromParams)
		) {
			currentOrganizationGuid = containerFromParams.guid;
		} else {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}

	if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const formData = await request.formData();
	const parseResult = z.array(z.uuid()).safeParse(formData.getAll('indicator'));

	if (parseResult.error) {
		error(422, error(400, { message: parseResult.error.message }));
	}

	const container = containerOfType(
		payloadTypes.enum.actual_data,
		currentOrganizationGuid,
		currentOrganizationalUnitGuid ?? null,
		currentOrganizationalUnitGuid ?? currentOrganizationGuid,
		env.PUBLIC_KC_REALM
	);

	if (!defineAbilityFor(locals.user).can('create', container)) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	await locals.pool.transaction(async (tx: CommonQueryMethods) => {
		const statistics =
			'geometry' in containerFromParams.payload && containerFromParams.payload.geometry
				? await getManyIndicatorDataWegweiserKommune(containerFromParams.payload.geometry)(tx)
				: [];

		const statisticsByIndicator = new Map(statistics.map((s) => [s.indicator_guid, s]));

		for (const currentIndicator of parseResult.data) {
			const statisticsForIndicator = statisticsByIndicator.get(currentIndicator);

			const newActualDataContainer = containerOfType(
				payloadTypes.enum.actual_data,
				currentOrganizationGuid,
				currentOrganizationalUnitGuid ?? null,
				currentOrganizationalUnitGuid ?? currentOrganizationGuid,
				env.PUBLIC_KC_REALM
			) as NewContainer & { payload: ActualDataContainer['payload'] };

			if (
				statisticsForIndicator &&
				statisticsForIndicator.actual_values.filter(([, v]) => v !== null).length > 0
			) {
				newActualDataContainer.payload = {
					...newActualDataContainer.payload,
					indicator: currentIndicator,
					source: 'Wegweiser Kommune',
					title: statisticsForIndicator.indicator_title,
					values: statisticsForIndicator.actual_values.filter(([, v]) => v !== null) as [
						number,
						number
					][]
				};
			} else {
				try {
					const indicator = await getContainerByGuid(currentIndicator)(tx);
					if (!isIndicatorTemplateContainer(indicator)) {
						continue;
					}

					newActualDataContainer.payload = {
						...newActualDataContainer.payload,
						indicator: currentIndicator,
						title: indicator.payload.title,
						values: []
					};
				} catch {
					continue;
				}
			}

			newActualDataContainer.user = [
				{
					predicate: 'is-creator-of',
					subject: locals.user.guid
				}
			];

			const foundActualDataContainers = await getManyContainers(
				[currentOrganizationGuid],
				{
					indicators: [currentIndicator],
					organizationalUnits: currentOrganizationalUnitGuid
						? [currentOrganizationalUnitGuid]
						: null,
					type: [payloadTypes.enum.actual_data]
				},
				''
			)(tx);

			const foundActualDataContainer = foundActualDataContainers[0];

			if (
				foundActualDataContainer &&
				!isSame(foundActualDataContainer.payload, newActualDataContainer.payload)
			) {
				await updateContainer({
					...foundActualDataContainer,
					payload: newActualDataContainer.payload
				})(tx);
			} else if (!foundActualDataContainer) {
				await createContainer(newActualDataContainer)(tx);
			}
		}
	});

	return new Response(null, { status: 204 });
};
