<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { predicates, type PayloadType } from '$lib/models';

	import type { PageData } from '../../routes/[guid=uuid]/programs/catalog/$types';

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

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-superordinate-of']
		]
	});
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
