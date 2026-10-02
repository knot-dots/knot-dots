import type { LayoutServerLoad } from './$types';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { loadApplicationContext } from '$lib/server/applicationContext';
import { payloadTypes } from '$lib/models';

function pageTitle(url: URL) {
	const segments = url.pathname.split('/');

	const workspaceType = segments[2];

	if (!workspaceType) {
		return '';
	}

	const workspaceView = segments[3];

	if (!workspaceView) {
		return '';
	}

	return unwrapFunctionStore(_)('workspace.' + workspaceType + '.title');
}

export const load = (async ({ depends, locals, params, url }) => {
	depends(payloadTypes.enum.organization, payloadTypes.enum.organizational_unit);
	const context = await loadApplicationContext({ locals, params, url });
	return { ...context, title: pageTitle(url) };
}) satisfies LayoutServerLoad;
