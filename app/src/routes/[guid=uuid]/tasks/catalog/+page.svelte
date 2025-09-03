<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import TasksPage from '$lib/components/TasksPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<TasksPage {data}>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.task]} />
	<Help slug="tasks-catalog" />
</TasksPage>
