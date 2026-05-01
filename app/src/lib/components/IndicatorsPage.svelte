<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { createFeatureDecisions } from '$lib/features';

	import type { PageData } from '../../routes/[guid=uuid]/indicators/catalog/$types';

	interface Props {
		actions?: Snippet;
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let { actions, children, data, filterBarInitiallyOpen = false }: Props = $props();

	let facets = $derived(data.facets);
	const featureDecisions = createFeatureDecisions(data.features ?? []);
</script>

<Layout>
	{#snippet header()}
		<Header
			{facets}
			facetLabels={data.facetLabels}
			{filterBarInitiallyOpen}
			categoryOptions={data.categoryOptions}
			search
		/>
		{#if actions && featureDecisions.useImportFromCsv()}
			<div class="indicator-actions">
				{@render actions()}
			</div>
		{/if}
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>

<style>
	.indicator-actions {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1.5rem;
		border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
	}
</style>
