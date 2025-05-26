<script lang="ts">
	import { getContext } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		type AnyContainer,
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

	const facets = new Map([
		['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
		['assignee', new Map()]
	]);

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');
</script>

<Header {facets} search {workspaceOptions} />

<Tasks
	{container}
	containers={containers.filter(isTaskContainer)}
	relatedContainers={containers
		.filter(isGoalContainer)
		.filter((c) => containers.filter(isTaskContainer).some(isPartOf(c)))}
/>

<Help slug="tasks" />
