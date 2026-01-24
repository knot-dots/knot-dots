<script lang="ts">
	import {
		computeFacetCount,
		isContainerWithPayloadType,
		isPartOf,
		payloadTypes,
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
			containers={containers.filter((c) => isContainerWithPayloadType(payloadTypes.enum.task, c))}
			relatedContainers={containers
				.filter((c) => isContainerWithPayloadType(payloadTypes.enum.goal, c))
				.filter((c) =>
					containers
						.filter((c) => isContainerWithPayloadType(payloadTypes.enum.task, c))
						.some(isPartOf(c))
				)}
		/>

		<Help slug="tasks-status" />
	{/snippet}
</Layout>
