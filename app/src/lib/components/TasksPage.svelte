<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { predicates, type PayloadType } from '$lib/models';

	import type { PageData } from '../../routes/[guid=uuid]/tasks/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		sortOptions?: [string, string][];
		filterBarInitiallyOpen?: boolean;
		showSaveWorkspace?: boolean;
		savePayloadType?: PayloadType[];
	}

	let {
		children,
		data,
		filterBarInitiallyOpen = false,
		sortOptions,
		showSaveWorkspace = false,
		savePayloadType = []
	}: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header
			{filterBarInitiallyOpen}
			{facets}
			search
			{sortOptions}
			{showSaveWorkspace}
			{savePayloadType}
		/>
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
