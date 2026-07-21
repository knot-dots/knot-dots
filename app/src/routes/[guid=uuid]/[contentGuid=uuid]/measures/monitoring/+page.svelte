<script lang="ts">
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer
	} from '$lib/models';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainer,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);
</script>

<Layout>
	{#snippet header()}
		<Header search />
	{/snippet}

	{#snippet main()}
		<MeasureMonitoring
			measure={isMeasureContainer(container) || isSimpleMeasureContainer(container)
				? container
				: undefined}
			{measures}
			containers={containers.filter(isMeasureMonitoringContainer)}
			indicators={containers.filter(isIndicatorTemplateContainer)}
			showMeasures={!isMeasureContainer(container) && !isSimpleMeasureContainer(container)}
		/>

		<ContextTabs slug="measures-monitoring" />
	{/snippet}
</Layout>
