<script lang="ts">
	import AssigneeFilter from '$lib/components/AssigneeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import TaskCategoryFilter from '$lib/components/TaskCategoryFilter.svelte';
	import {
		type AnyContainer,
		type Container,
		isGoalContainer,
		isPartOf,
		isTaskContainer
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();
</script>

<aside>
	<Sidebar helpSlug="overlay-tasks">
		<Search slot="search" />
		<svelte:fragment slot="filters">
			<TaskCategoryFilter />
			<AssigneeFilter />
		</svelte:fragment>
		<slot slot="extra" />
	</Sidebar>
</aside>

<Tasks
	{container}
	containers={containers.filter(isTaskContainer)}
	relatedContainers={containers
		.filter(isGoalContainer)
		.filter((c) => containers.filter(isTaskContainer).some(isPartOf(c)))}
/>
