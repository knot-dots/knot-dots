<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type AnyPayload,
		computeFacetCount,
		type Container,
		isGoalContainer,
		isPartOf,
		isTaskContainer,
		taskCategories
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	setBulkActionContext({
		actions: ['status', 'visibility', 'delete'],
		cascadingDelete: true,
		selected: new SvelteSet<string>()
	});

	let categoryContext = $derived(page.data.categoryContext);

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

<Header {facets} search />

<div class="content">
	<Tasks
		{container}
		containers={containers.filter(isTaskContainer)}
		relatedContainers={containers
			.filter(isGoalContainer)
			.filter((c) => containers.filter(isTaskContainer).some(isPartOf(c)))}
	/>

	<ContextTabs slug="tasks-status" />
</div>
