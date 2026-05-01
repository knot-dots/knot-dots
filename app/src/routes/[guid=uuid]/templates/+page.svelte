<script lang="ts">
	import { setContext } from 'svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { predicates, templatablePayloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} facetLabels={data.facetLabels} categoryOptions={data.categoryOptions} search />
	{/snippet}

	{#snippet main()}
		<Catalog containers={data.containers} payloadType={[...templatablePayloadTypes]} />

		<Help slug="measures-templates" />
	{/snippet}
</Layout>
