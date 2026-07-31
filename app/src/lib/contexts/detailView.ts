import { Collapsible } from 'melt/builders';
import { getContext, setContext } from 'svelte';

const key = {};

interface DetailView {
	properties: Collapsible;
}

export function setDetailViewContext(context: DetailView) {
	return setContext(key, context);
}

export function getDetailViewContext(): DetailView {
	return getContext(key);
}
