<script lang="ts">
	import withOptimistic from '$lib/client/withOptimistic';
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import TasksPage from '$lib/components/TasksPage.svelte';
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

<PageLayout>
	<TasksPage data={{ ...data, containers }} filterBarInitiallyOpen>
		<Catalog {containers} payloadType={[payloadTypes.enum.task]} />
		<ContextTabs slug="tasks-catalog" />
	</TasksPage>
</PageLayout>
