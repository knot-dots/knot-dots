import type { Navigation } from '@sveltejs/kit';

export type NavigationKind = 'hash' | 'page' | 'query';

type PendingNavigation = Pick<Navigation, 'from' | 'to'>;

// Tells apart page changes, changes of the query only (e.g. filters of a
// workspace) and changes of the hash only (e.g. overlays), which are loaded
// differently and therefore get different loading indicators.
export default function navigationKind(
	navigation: PendingNavigation | null | undefined
): NavigationKind | undefined {
	if (!navigation?.to) {
		return undefined;
	}

	const from = navigation.from?.url;
	const to = navigation.to.url;

	if (!from || from.origin !== to.origin || from.pathname !== to.pathname) {
		return 'page';
	}

	return from.search === to.search ? 'hash' : 'query';
}
