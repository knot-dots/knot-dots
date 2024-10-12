<script lang="ts">
	import { page } from '$app/stores';
	import { createFeatureDecisions } from '$lib/features';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import NewMeasureMonitoring from '$lib/components/NewMeasureMonitoring.svelte';
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
{#if createFeatureDecisions($page.data.features).useNewMeasureMonitoringBoard()}
	<NewMeasureMonitoring
		measures={[container]}
		containers={containers.filter(isMeasureMonitoringContainer)}
		indicators={containers.filter(isIndicatorContainer)}
	/>
{:else}
	<MeasureMonitoring
		{container}
		containers={containers.filter(isMeasureMonitoringContainer)}
		indicators={containers.filter(isIndicatorContainer)}
	/>
{/if}
