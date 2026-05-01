<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const customCategoryColumns = $derived(
		getCategoryKeys(data.categoryOptions).map((key) => ({
			heading: data.categoryOptions.__categoryLabels__?.[key] ?? key,
			key
		}))
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('program_status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('program_type'), key: 'objectType' }
	]);
</script>

<ProgramsPage {data}>
	<Table categoryOptions={data.categoryOptions} {columns} rows={data.containers} />
	<Help slug="set-of-rules-table" />
</ProgramsPage>
