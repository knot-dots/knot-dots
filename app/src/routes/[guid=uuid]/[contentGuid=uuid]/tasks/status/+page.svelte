<script lang="ts">
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

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(data.containers);

	let facets = $derived(
		computeFacetCount(
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
