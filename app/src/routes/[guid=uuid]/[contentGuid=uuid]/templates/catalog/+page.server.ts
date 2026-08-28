import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { fetchTemplates } from '$lib/load/templates';
import { type AnyPayload, type Container, isProgramContainer } from '$lib/models';
import { getAllContainerRevisionsByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, params, parent, url }) => {
	depends('containers');

	const t = unwrapFunctionStore(_);

	try {
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid));
		const container = revisions.at(-1) as Container<AnyPayload>;

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		if (!isProgramContainer(container)) {
			error(404, { message: t('error.not_found') });
		}

		const {
			categoryContext: rawCategoryContext,
			currentOrganization,
			currentOrganizationalUnit
		} = await parent();

		const templates = await fetchTemplates({
			pool: locals.pool,
			user: locals.user,
			url,
			rawCategoryContext,
			currentOrganization,
			currentOrganizationalUnit
		});

		return {
			container,
			...templates,
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.templates.title')} / ${t('workspace.view.catalog')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
