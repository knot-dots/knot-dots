<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { computeFacetCount, predicates } from '$lib/models';

	import type { PageData } from '../../routes/[guid=uuid]/tasks/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		sortOptions?: [string, string][];
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false, sortOptions }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let featureDecisions = $derived(createFeatureDecisions(page.data.features));
	let categoryContext = $derived(page.data.categoryContext);
	let useCustomCategories = $derived(featureDecisions.useCustomCategories() && !!categoryContext);

	let facets = $derived(
		computeFacetCount(data.facets, data.containers, {
			useCategoryPayload: useCustomCategories,
			reset: true
		})
	);
</script>

<Layout>
	{#snippet header()}
		<Header
			{filterBarInitiallyOpen}
			{facets}
			facetLabels={useCustomCategories ? categoryContext!.labels : undefined}
			categoryOptions={useCustomCategories ? categoryContext!.options : null}
			search
			{sortOptions}
		/>
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
