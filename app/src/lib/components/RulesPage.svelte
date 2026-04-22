<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { computeFacetCount, type AnyContainer, predicates } from '$lib/models';

	import type { PageData } from '../../routes/[guid=uuid]/rules/catalog/$types';

	interface Props {
		children: Snippet;
		containers?: AnyContainer[];
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let {
		children,
		data,
		containers = data.containers,
		filterBarInitiallyOpen = false
	}: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-inconsistent-with']]
	});

	let facets = $derived(computeFacetCount(data.facets, containers, { reset: true }));
</script>

<Layout>
	{#snippet header()}
		<Header {filterBarInitiallyOpen} {facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
