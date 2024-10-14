<script lang="ts">
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import {
		type Container,
		isIndicatorContainer,
		isMeasureMonitoringContainer,
		type MeasureContainer,
		type SimpleMeasureContainer
	} from '$lib/models';

	export let container: MeasureContainer | SimpleMeasureContainer;
	export let containers: Container[];
</script>

<aside>
	<Sidebar helpSlug="internal-objectives">
		<Search slot="search" />
		<Sort slot="sort" />
		<slot slot="extra" />
	</Sidebar>
</aside>

<MeasureMonitoring
	measures={[container]}
	containers={containers.filter(isMeasureMonitoringContainer)}
	indicators={containers.filter(isIndicatorContainer)}
/>
