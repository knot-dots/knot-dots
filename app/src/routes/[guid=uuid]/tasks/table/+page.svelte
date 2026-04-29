<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import Table from '$lib/components/Table.svelte';
	import TasksPage from '$lib/components/TasksPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<TasksPage data={{ ...data, containers }}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('task_status.label'), key: 'status' },
			{ heading: $_('task_category.label'), key: 'taskCategory' },
			{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={containers}
	/>
	<Help slug="tasks-table" />
</TasksPage>
