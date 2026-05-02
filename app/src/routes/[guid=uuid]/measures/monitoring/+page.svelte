<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer
	} from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
	let measures = $derived(containers.filter(isMeasureContainer));
</script>

<Layout>
	{#snippet header()}
		<Header search />
	{/snippet}

	{#snippet main()}
		<MeasureMonitoring
			{measures}
			containers={containers.filter(isMeasureMonitoringContainer)}
			indicators={containers.filter(isIndicatorTemplateContainer)}
			showMeasures
		/>

		<Help slug="measures-monitoring" />
	{/snippet}
</Layout>
