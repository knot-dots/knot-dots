<script lang="ts">
	import { _ } from 'svelte-i18n';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import Table from '$lib/components/Table.svelte';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

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
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('goal_status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
		{ heading: $_('goal_type'), key: 'objectType' }
	]);
</script>

<GoalsPage data={{ ...data, containers }}>
	<Table categoryOptions={data.categoryOptions} {columns} rows={containers} />
	<Help slug="goals-table" />
</GoalsPage>
