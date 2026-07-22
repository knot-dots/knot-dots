<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { payloadTypes } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainer,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
</script>

<Layout>
	{#snippet header()}
		<Header facets={data.facets} search />
	{/snippet}

	{#snippet main()}
		<Catalog {containers} payloadType={[payloadTypes.enum.resource_v2]} hideCreateButton={true} />
		<ContextTabs slug="resources-catalog" />
	{/snippet}
</Layout>
