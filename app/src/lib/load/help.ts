import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import {
	applyPagination,
	type PaginatedLoadOptions,
	queryLimit,
	queryOffset
} from '$lib/pagination';
import { payloadTypes } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from '../../routes/[guid=uuid]/help/$types';

export default (async function load(
	{ depends, locals, parent, url },
	options?: PaginatedLoadOptions
) {
	depends('containers');

	const { currentOrganization } = await parent();

	if (!currentOrganization.payload.default) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const scope = currentOrganization.payload.default ? [] : [currentOrganization.guid];
	const filters = {
		terms: url.searchParams.get('terms') ?? '',
		type: [payloadTypes.enum.help]
	};
	const sort = url.searchParams.get('sort') ?? '';

	const containers = await locals.pool.connect(
		getManyContainers(scope, filters, sort, {
			limit: queryLimit(options),
			offset: queryOffset(options)
		})
	);

	const page = applyPagination(containers, options);
	const filtered = filterVisible(page.containers, locals.user);

	return {
		containers: filtered,
		hasMore: page.hasMore
	};
} satisfies PageServerLoad);
