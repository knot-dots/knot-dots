<script lang="ts">
	import AssigneeFilter from '$lib/components/AssigneeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import TaskCategoryFilter from '$lib/components/TaskCategoryFilter.svelte';
	import { type AnyContainer, type Container, isGoalContainer, isTaskContainer } from '$lib/models';

	export let container: AnyContainer;
	export let containers: Container[];
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
	relatedContainers={containers.filter(isGoalContainer)}
/>
