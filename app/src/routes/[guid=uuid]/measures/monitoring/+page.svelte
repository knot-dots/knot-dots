<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer
	} from '$lib/models';
	import type { PageProps } from './$types';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';

	let { data }: PageProps = $props();

	let measures = $derived(data.containers.filter(isMeasureContainer));
</script>

<MeasuresPage {data}>
	<MeasureMonitoring
		{measures}
		containers={data.containers.filter(isMeasureMonitoringContainer)}
		indicators={data.containers.filter(isIndicatorContainer)}
		showMeasures
	/>
	<Help slug="measures-monitoring" />
</MeasuresPage>
