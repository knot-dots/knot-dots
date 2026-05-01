<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { payloadTypes } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<Layout>
	{#snippet header()}
		<Header facets={data.facets} search />
	{/snippet}

	{#snippet main()}
		<Catalog {containers} payloadType={[payloadTypes.enum.resource_v2]} hideCreateButton={true} />
		<Help slug="resources-catalog" />
	{/snippet}
</Layout>
