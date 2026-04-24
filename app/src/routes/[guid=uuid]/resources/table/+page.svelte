<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import ResourcesPage from '$lib/components/ResourcesPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<ResourcesPage data={{ ...data, containers }}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			// { heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('resource_category'), key: 'resourceCategory' },
			{ heading: $_('label.unit'), key: 'resourceUnit' }
			// { heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={containers}
	/>
	<Help slug="resources-table" />
</ResourcesPage>
