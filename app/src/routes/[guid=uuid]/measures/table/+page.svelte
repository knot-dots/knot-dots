<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
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
		{ heading: $_('status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('planned_duration'), key: 'duration' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('measure_type'), key: 'objectType' }
	]);
</script>

<MeasuresPage data={{ ...data, containers }}>
	<Table categoryOptions={data.categoryOptions} {columns} rows={containers} />
	<Help slug="measures-table" />
</MeasuresPage>
