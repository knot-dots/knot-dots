<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<IndicatorsPage {data} filterBarInitiallyOpen>
	<NewIndicators containers={data.containers} />
	<Help slug="indicators" />
</IndicatorsPage>
