<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import withOptimistic from '$lib/client/withOptimistic';
	import Help from '$lib/components/Help.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	const customCategoryColumns = $derived(
		page.data.categoryContext.keys
			.filter((key) => data.facets.has(key))
			.map((key) => ({
				heading: page.data.categoryContext.labels.get(key) ?? key,
				key
			}))
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('rule_status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
	]);
</script>

<RulesPage data={{ ...data, containers }}>
	<Table {columns} rows={containers} />
	<Help slug="rules-table" />
</RulesPage>
