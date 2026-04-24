<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import Table from '$lib/components/Table.svelte';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import { createFeatureDecisions } from '$lib/features';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

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
		{ heading: $_('goal_status'), key: 'status' },
		...(customCategoryColumns ?? legacyCategoryColumns),
		{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
		{ heading: $_('goal_type'), key: 'objectType' }
	]);
</script>

<GoalsPage data={{ ...data, containers }}>
	<Table
		categoryOptions={featureDecisions.useCustomCategories() ? data.categoryOptions : undefined}
		{columns}
		rows={containers}
	/>
	<Help slug="goals-table" />
</GoalsPage>
