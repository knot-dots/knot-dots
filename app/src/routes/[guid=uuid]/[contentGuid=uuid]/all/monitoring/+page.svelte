<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import type { PageProps } from './$types';
	import {
		audience,
		computeFacetCount,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(data.containers);

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);

	let facets = $derived(
		computeFacetCount(
			new Map([
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
			]),
			containers
		)
	);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<MeasureMonitoring
			measure={isMeasureContainer(container) || isSimpleMeasureContainer(container)
				? container
				: undefined}
			{measures}
			containers={containers.filter(isMeasureMonitoringContainer)}
			indicators={containers.filter(isIndicatorContainer)}
			showMeasures={!isMeasureContainer(container) && !isSimpleMeasureContainer(container)}
		/>

		<Help slug="measures-monitoring" />
	{/snippet}
</Layout>
