<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer
	} from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer } from '$lib/stores';
	import type { PageProps } from './$types';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';

	let { data }: PageProps = $props();

	let containers = $derived(withOptimistic(data.containers, $lastCreatedContainer));
	let measures = $derived(containers.filter(isMeasureContainer));
</script>

<MeasuresPage {data}>
	<MeasureMonitoring
		{measures}
		containers={containers.filter(isMeasureMonitoringContainer)}
		indicators={containers.filter(isIndicatorContainer)}
		showMeasures
	/>
	<Help slug="measures-monitoring" />
</MeasuresPage>
