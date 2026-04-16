<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';
	import { createFeatureDecisions } from '$lib/features';

	let { data }: PageProps = $props();

	let usePage = $derived(createFeatureDecisions(page.data.features).usePage());
</script>

<AllPage {data} filterBarInitiallyOpen>
	<Catalog
		containers={data.containers.slice(0, browser ? undefined : 20)}
		payloadType={[
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			...(usePage ? [payloadTypes.enum.page] : []),
			payloadTypes.enum.program,
			payloadTypes.enum.report,
			payloadTypes.enum.rule,
			payloadTypes.enum.simple_measure
		]}
	/>
	<Help slug="all-catalog" />
</AllPage>
