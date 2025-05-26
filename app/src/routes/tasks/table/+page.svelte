<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import Table from '$lib/components/Table.svelte';
	import TasksPage from '$lib/components/TasksPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<TasksPage {data}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={data.containers}
	/>
	<Help slug="tasks-table" />
</TasksPage>
