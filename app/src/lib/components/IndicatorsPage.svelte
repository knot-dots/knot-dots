<script lang="ts">
	import { type Snippet } from 'svelte';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
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

<PageLayout>
	<BulkActionContextProvider actions={['visibility', 'delete']}>
		<FullscreenLayout>
			{#snippet header()}
				<Header {facets} {filterBarInitiallyOpen} search />
				{#if actions && featureDecisions.useImportFromCsv()}
					<div class="indicator-actions">
						{@render actions()}
					</div>
				{/if}
			{/snippet}

			{#snippet main()}
				{@render children()}
			{/snippet}
		</FullscreenLayout>
	</BulkActionContextProvider>
</PageLayout>

<style>
	.indicator-actions {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1.5rem;
		border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
	}
</style>
