<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<IndicatorsPage
	{data}
	filterBarInitiallyOpen
	showSaveWorkspace
	savePayloadType={[payloadTypes.enum.indicator]}
>
	{#if data.useNewIndicators}
		<NewIndicators containers={data.containers} />
	{:else}
		<Indicators containers={data.containers} />
	{/if}
	<Help slug="indicators" />
</IndicatorsPage>
