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
		computeFacetCount(buildCategoryFacetsWithCounts(categoryContext.options), containers)
	);
</script>

<Header
	{facets}
	facetLabels={categoryContext.labels}
	categoryOptions={categoryContext.options}
	search
/>

<Chapters program={isProgramContainer(container) ? container : undefined} {containers} />

<Help slug="all-level" />
