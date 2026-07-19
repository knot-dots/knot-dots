<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type AnyPayload,
		type Container,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	setBulkActionContext({
		actions: ['status', 'visibility', 'delete'],
		cascadingDelete: true,
		selected: new SvelteSet<string>()
	});

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);
</script>

<Header search />

<div class="content">
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
</div>
