<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import TeaserCard from '$lib/components/TeaserCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import { computeFacetCount, type Container, payloadTypes, type TeaserPayload } from '$lib/models';
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

<div class="content-details">
	<div class="details">
		<Wall items={containers} addItem={() => {}} itemSnippet={teaserSnippet} />
	</div>

	<Help slug="teaser-view" />
</div>

{#snippet teaserSnippet(item: Container)}
	<TeaserCard container={item as Container<TeaserPayload>} editable={false} />
{/snippet}
