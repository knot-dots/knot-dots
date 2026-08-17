<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { predicates } from '$lib/models';
	import type { PageData } from '../../routes/[guid=uuid]/resources/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		sortOptions?: [string, string][];
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, sortOptions, filterBarInitiallyOpen = false }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let facets = $derived(data.facets);
</script>

<PageLayout>
	<FullscreenLayout>
		{#snippet header()}
			<Header {filterBarInitiallyOpen} {facets} search {sortOptions} />
		{/snippet}

		{#snippet main()}
			{@render children()}
		{/snippet}
	</FullscreenLayout>
</PageLayout>
