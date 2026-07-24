<script lang="ts">
	import { resource, type ResourceReturn } from 'runed';
	import type { Snippet } from 'svelte';
	import fetchHelpBySlug from '$lib/client/fetchHelpBySlug';
	import { type Container, type HelpPayload, type HelpSlug } from '$lib/models';

	interface Props {
		children: Snippet<[ResourceReturn<Array<Container<HelpPayload>>>]>;
		slug: HelpSlug;
	}

	let { children, slug }: Props = $props();

	const containers = resource([() => slug], async ([slug]) => fetchHelpBySlug(slug));
</script>

{@render children(containers)}
