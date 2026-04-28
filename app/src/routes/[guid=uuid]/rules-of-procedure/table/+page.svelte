<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Help from '$lib/components/Help.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import { createFeatureDecisions } from '$lib/features';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const featureDecisions = $derived(createFeatureDecisions(page.data.features ?? []));

	const legacyCategoryColumns = [
		{ heading: $_('category'), key: 'sdg' },
		{ heading: $_('topic'), key: 'topic' },
		{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
		{ heading: $_('audience'), key: 'audience' }
	];

	const customCategoryColumns = $derived(
		featureDecisions.useCustomCategories() && data.categoryOptions
			? getCategoryKeys(data.categoryOptions).map((key) => ({
					heading: data.categoryOptions?.__categoryLabels__?.[key] ?? key,
					key
				}))
			: null
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('program_status'), key: 'status' },
		...(customCategoryColumns ?? legacyCategoryColumns),
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('program_type'), key: 'objectType' }
	]);
</script>

<ProgramsPage {data}>
	<Table
		categoryOptions={featureDecisions.useCustomCategories() ? data.categoryOptions : undefined}
		{columns}
		rows={data.containers}
	/>
	<Help slug="rules-of-procedure-table" />
</ProgramsPage>
