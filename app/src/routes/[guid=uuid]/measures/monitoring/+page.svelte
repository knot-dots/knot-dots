<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import { isContainerWithPayloadType, payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let measures = $derived(
		data.containers.filter((container) =>
			isContainerWithPayloadType(payloadTypes.enum.measure, container)
		)
	);
</script>

<MeasuresPage {data}>
	<MeasureMonitoring
		{measures}
		containers={data.containers.filter(
			(container) =>
				isContainerWithPayloadType(payloadTypes.enum.effect, container) ||
				isContainerWithPayloadType(payloadTypes.enum.goal, container) ||
				isContainerWithPayloadType(payloadTypes.enum.task, container)
		)}
		indicators={data.containers.filter((container) =>
			isContainerWithPayloadType(payloadTypes.enum.indicator, container)
		)}
		showMeasures
	/>
	<Help slug="measures-monitoring" />
</MeasuresPage>
