<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		computeFacetCount,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer
	} from '$lib/models';
	import { lastCreatedContainer } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(withOptimistic(data.containers, $lastCreatedContainer));

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);

	let facets = $derived(
		computeFacetCount(buildCategoryFacetsWithCounts(page.data.categoryContext.options), containers)
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
			indicators={containers.filter(isIndicatorTemplateContainer)}
			showMeasures={!isMeasureContainer(container) && !isSimpleMeasureContainer(container)}
		/>

		<Help slug="measures-monitoring" />
	{/snippet}
</Layout>
