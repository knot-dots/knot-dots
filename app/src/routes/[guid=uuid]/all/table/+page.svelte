<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import type { PageProps } from './$types';
	import Table from '$lib/components/Table.svelte';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	const customCategoryColumns = $derived(
		data.categoryOptions
			? getCategoryKeys(data.categoryOptions).map((key) => ({
					heading: data.categoryOptions?.__categoryLabels__?.[key] ?? key,
					key
				}))
			: []
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('object'), key: 'type' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
		{ heading: $_('planned_duration'), key: 'duration' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
		{ heading: $_('type'), key: 'objectType' }
	]);
</script>

<AllPage data={{ ...data, containers }}>
	<Table
		categoryOptions={data.categoryOptions}
		{columns}
		rows={containers.slice(0, browser ? undefined : 20)}
	/>
	<Help slug="all-table" />
</AllPage>
