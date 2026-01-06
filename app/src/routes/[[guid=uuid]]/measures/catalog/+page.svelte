<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<MeasuresPage {data} filtersInitiallyOpened>
	<Catalog
		containers={data.containers}
		payloadType={[payloadTypes.enum.measure, payloadTypes.enum.simple_measure]}
	/>
	<Help slug="measures-catalog" />
</MeasuresPage>
