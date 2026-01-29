import type { LayoutServerLoad } from './$types';
import { _, unwrapFunctionStore } from 'svelte-i18n';

function pageTitle(url: URL) {
	const segments = url.pathname.split('/');
	let title = '';

	const workspaceType = segments[2];

	if (!workspaceType) {
		return '';
	}

	const workspaceView = segments[3];

	if (!workspaceView) {
		return '';
	}

	title =
		unwrapFunctionStore(_)('workspace.type.' + workspaceType) +
		' / ' +
		unwrapFunctionStore(_)('workspace.view.' + workspaceView);

	return title;
}

export const load = (async ({ url }) => {
	return { title: pageTitle(url) };
}) satisfies LayoutServerLoad;
