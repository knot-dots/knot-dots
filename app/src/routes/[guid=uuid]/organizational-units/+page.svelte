<script lang="ts">
	import { browser } from '$app/environment';
	import AdministrativeAreaCard from '$lib/components/AdministrativeAreaCard.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Layout>
	{#snippet header()}
		<Header workspaceOptions={[]} facets={data.facets} filterBarInitiallyOpen search />
	{/snippet}

	{#snippet main()}
		<Catalog containers={data.containers.slice(0, browser ? undefined : 20)} payloadType={[]}>
			{#snippet item(container)}
				<AdministrativeAreaCard {container} />
			{/snippet}
		</Catalog>
	{/snippet}
</Layout>
