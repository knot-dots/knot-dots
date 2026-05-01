<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		type AnyContainer,
		computeFacetCount,
		type Container,
		isGoalContainer,
		isPartOf,
		isTaskContainer,
		taskCategories
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	let categoryContext = $derived(page.data.categoryContext);

	let facets = $derived(
		categoryContext
			? computeFacetCount(
					new Map([
						...buildCategoryFacetsWithCounts(categoryContext.options),
						['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
						['assignee', new Map()]
					]),
					containers
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

<Header
	{facets}
	facetLabels={categoryContext ? categoryContext.labels : undefined}
	categoryOptions={categoryContext ? categoryContext.options : null}
	search
/>

<Tasks
	{container}
	containers={containers.filter(isTaskContainer)}
	relatedContainers={containers
		.filter(isGoalContainer)
		.filter((c) => containers.filter(isTaskContainer).some(isPartOf(c)))}
/>

<Help slug="tasks-status" />
