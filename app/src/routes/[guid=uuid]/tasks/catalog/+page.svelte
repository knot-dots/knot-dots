<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import TasksPage from '$lib/components/TasksPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
</script>

<TasksPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog {containers} payloadType={[payloadTypes.enum.task]} />
	<ContextTabs slug="tasks-catalog" />
</TasksPage>
