<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		type AnyContainer,
		type Container,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);
</script>

<Header search />

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
