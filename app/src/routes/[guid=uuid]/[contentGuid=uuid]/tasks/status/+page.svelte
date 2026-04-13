<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import {
		computeFacetCount,
		isGoalContainer,
		isPartOf,
		isTaskContainer,
		taskCategories
	} from '$lib/models';
	import type { PageProps } from './$types';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { createFeatureDecisions } from '$lib/features';
	import { lastCreatedContainer } from '$lib/stores';

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(withOptimistic(data.containers, $lastCreatedContainer));

	let featureDecisions = $derived(createFeatureDecisions(page.data.features));
	let categoryContext = $derived(page.data.categoryContext);
	let useCustomCategories = $derived(featureDecisions.useCustomCategories() && !!categoryContext);

	let facets = $derived(
		useCustomCategories
			? computeFacetCount(
					new Map([
						...buildCategoryFacetsWithCounts(categoryContext!.options),
						['assignee', new Map()]
					]),
					containers,
					{ useCategoryPayload: true }
				)
			: computeFacetCount(
					new Map([
						['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
						['assignee', new Map()]
					]),
					containers
				)
	);
</script>

<Layout>
	{#snippet header()}
		<Header
			{facets}
			facetLabels={useCustomCategories ? categoryContext!.labels : undefined}
			categoryOptions={useCustomCategories ? categoryContext!.options : null}
			search
		/>
	{/snippet}

	{#snippet main()}
		<Tasks
			{container}
			containers={containers.filter(isTaskContainer)}
			relatedContainers={containers
				.filter(isGoalContainer)
				.filter((c) => containers.filter(isTaskContainer).some(isPartOf(c)))}
		/>

		<Help slug="tasks-status" />
	{/snippet}
</Layout>
