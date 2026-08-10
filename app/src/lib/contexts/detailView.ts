import { Collapsible } from 'melt/builders';
import { getContext, setContext } from 'svelte';

const key = {};

interface DetailView {
	properties: Collapsible;
	relocationNoticeSeen: boolean;
}

export function setDetailViewContext(context: DetailView) {
	return setContext(key, context);
}

export function getDetailViewContext(): DetailView {
	return getContext(key);
}
