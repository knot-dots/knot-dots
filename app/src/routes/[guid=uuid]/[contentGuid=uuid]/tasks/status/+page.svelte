<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		computeFacetCount,
		isGoalContainer,
		isPartOf,
		isTaskContainer,
		payloadTypes,
		predicates,
		taskCategories
	} from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let container = $derived(data.container);

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
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

		<ContextTabs slug="tasks-status" />
	{/snippet}
</Layout>
