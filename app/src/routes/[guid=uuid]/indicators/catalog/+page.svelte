<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<IndicatorsPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<NewIndicators {containers} />
	<Help slug="indicators" />
</IndicatorsPage>
