<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer
	} from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
	let measures = $derived(containers.filter(isMeasureContainer));
</script>

<MeasuresPage {data}>
	<MeasureMonitoring
		{measures}
		containers={containers.filter(isMeasureMonitoringContainer)}
		indicators={containers.filter(isIndicatorTemplateContainer)}
		showMeasures
	/>
	<Help slug="measures-monitoring" />
</MeasuresPage>
