<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { isContainerWithPayloadType, payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let usePage = $derived(createFeatureDecisions(page.data.features).usePage());
</script>

<AllPage {data} filterBarInitiallyOpen>
	<Catalog
		containers={data.containers
			.filter(
				(c) =>
					isContainerWithPayloadType(payloadTypes.enum.goal, c) ||
					isContainerWithPayloadType(payloadTypes.enum.measure, c) ||
					(usePage && isContainerWithPayloadType(payloadTypes.enum.page, c)) ||
					isContainerWithPayloadType(payloadTypes.enum.program, c) ||
					isContainerWithPayloadType(payloadTypes.enum.report, c) ||
					isContainerWithPayloadType(payloadTypes.enum.rule, c) ||
					isContainerWithPayloadType(payloadTypes.enum.simple_measure, c)
			)
			.slice(0, browser ? undefined : 20)}
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
