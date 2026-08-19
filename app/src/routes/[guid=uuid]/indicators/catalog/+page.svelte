<script lang="ts">
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
</script>

<IndicatorsPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<NewIndicators compare {containers} />
	<ContextTabs slug="indicators" />
</IndicatorsPage>
