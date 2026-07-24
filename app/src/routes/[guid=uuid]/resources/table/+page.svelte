<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import ResourcesPage from '$lib/components/ResourcesPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainer,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
</script>

<ResourcesPage data={{ ...data, containers }}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('resource_category'), key: 'resourceCategory' },
			{ heading: $_('label.unit'), key: 'resourceUnit' }
		]}
		rows={containers}
	/>
	<ContextTabs slug="resources-table" />
</ResourcesPage>
