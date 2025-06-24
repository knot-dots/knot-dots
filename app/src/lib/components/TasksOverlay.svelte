<script lang="ts">
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

<Header {facets} search />

<Tasks
	{container}
	containers={containers.filter(isTaskContainer)}
	relatedContainers={containers
		.filter(isGoalContainer)
		.filter((c) => containers.filter(isTaskContainer).some(isPartOf(c)))}
/>

<Help slug="tasks" />
