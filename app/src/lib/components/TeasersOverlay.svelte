<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import TeaserCard from '$lib/components/TeaserCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import {
		computeFacetCount,
		type Container,
		type TeaserContainer,
		payloadTypes
	} from '$lib/models';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import { page } from '$app/state';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let facets = $derived(
		computeFacetCount(
			buildCategoryFacetsWithCounts(
				filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.teaser], {
					matchAll: true
				}).options
			),
			containers
		)
	);
</script>

<Header {facets} search />

<div class="content-details masked-overflow">
	<div class="details">
		<Wall items={containers} addItem={() => {}} itemSnippet={teaserSnippet} />
	</div>
</div>

{#snippet teaserSnippet(item: Container)}
	<TeaserCard container={item as TeaserContainer} editable={false} />
{/snippet}

<Help slug="teaser-view" />

<style>
	.content-details {
		flex: 1;
		padding: 1rem;
	}
</style>
