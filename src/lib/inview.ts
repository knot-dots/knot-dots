import { inview as inviewDefault } from 'svelte-inview';

export function inview(node: HTMLElement) {
	return inviewDefault(node, { threshold: 0.7 });
}
