<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
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

<IndicatorsPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<NewIndicators {containers} />
	<ContextTabs slug="indicators" />
</IndicatorsPage>
