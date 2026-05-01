<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Chapters from '$lib/components/Chapters.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import {
		type AnyContainer,
		computeFacetCount,
		type Container,
		isProgramContainer
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	let categoryContext = $derived(page.data.categoryContext);

	let facets = $derived(
		categoryContext
			? computeFacetCount(buildCategoryFacetsWithCounts(categoryContext.options), containers)
			: computeFacetCount(new Map([]), containers)
	);
</script>

<Header
	{facets}
	facetLabels={categoryContext ? categoryContext.labels : undefined}
	categoryOptions={categoryContext ? categoryContext.options : null}
	search
/>

<Chapters program={isProgramContainer(container) ? container : undefined} {containers} />

<Help slug="all-level" />
