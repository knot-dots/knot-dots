<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PayloadType } from '$lib/models';

	import type { PageData } from '../../routes/[guid=uuid]/knowledge/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
		showSaveWorkspace?: boolean;
		savePayloadType?: PayloadType[];
	}
	let {
		children,
		data,
		filterBarInitiallyOpen = false,
		showSaveWorkspace = false,
		savePayloadType = []
	}: Props = $props();

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header
			{filterBarInitiallyOpen}
			{facets}
			facetLabels={data.facetLabels ?? undefined}
			categoryOptions={data.categoryOptions ?? null}
			search
			{showSaveWorkspace}
			{savePayloadType}
		/>
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
