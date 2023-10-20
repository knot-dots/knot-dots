import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { containerOfType } from '$lib/models';
import type { Container, PayloadType } from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
	getAllRelatedInternalObjectives,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url, parent }) => {
	let revisions;
	let strategyOverlayData;

	try {
		revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.guid));
	} catch (e) {
		if (e instanceof NotFoundError) {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}

	const container = revisions[revisions.length - 1];

	let relatedContainers: Container[];
	if (params.type.includes('internal_objective')) {
		relatedContainers = await locals.pool.connect(
			getAllRelatedInternalObjectives(params.guid, ['hierarchical'], '')
		);
	} else {
		relatedContainers = await locals.pool.connect(
			getAllRelatedContainers([container.organization], params.guid, ['hierarchical'], {}, '')
		);
	}

	if (url.searchParams.has('edit')) {
		strategyOverlayData = {
			container,
			isPartOfOptions: [],
			relatedContainers,
			revisions
		};
	} else if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') as string;
		const selectedContainer = relatedContainers.find(
			(c) => url.searchParams.get('container-preview') == c.guid
		) as Container;
		const [isPartOfOptions, revisions] = await Promise.all([
			locals.pool.connect(
				maybePartOf(
					selectedContainer.organizational_unit ?? selectedContainer.organization,
					selectedContainer.payload.type
				)
			),
			locals.pool.connect(getAllContainerRevisionsByGuid(guid))
		]);
		strategyOverlayData = {
			container: selectedContainer,
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	} else if (url.searchParams.has('overlay-new')) {
		const { currentOrganization, currentOrganizationalUnit } = await parent();
		const newContainer = containerOfType(
			url.searchParams.get('overlay-new') as PayloadType,
			currentOrganization.guid,
			currentOrganizationalUnit?.guid ?? null,
			env.PUBLIC_KC_REALM
		);
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(
				currentOrganizationalUnit ? currentOrganizationalUnit.guid : currentOrganization.guid,
				url.searchParams.get('overlay-new') as PayloadType
			)
		);
		strategyOverlayData = {
			container: newContainer,
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	}

	return {
		container,
		relatedContainers,
		revisions,
		...(strategyOverlayData ? { strategyOverlayData } : undefined)
	};
}) satisfies PageServerLoad;
