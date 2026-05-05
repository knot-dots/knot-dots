<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		computeFacetCount,
		isGoalContainer,
		isPartOf,
		isTaskContainer,
		payloadTypes,
		taskCategories
	} from '$lib/models';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	let categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.task])
	);

	let facets = $derived(
		computeFacetCount(
			new Map([
				...buildCategoryFacetsWithCounts(categoryContext.options),
				['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
				['assignee', new Map()]
			]),
			containers
		)
	);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
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
