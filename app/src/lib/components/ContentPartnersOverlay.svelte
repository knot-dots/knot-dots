<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import ContentPartnerCard from '$lib/components/ContentPartnerCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import {
		computeFacetCount,
		type Container,
		type ContentPartnerContainer,
		payloadTypes
	} from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let facets = $derived(
		computeFacetCount(
			buildCategoryFacetsWithCounts(
				filterCategoryContext(page.data.categoryContext, [
					payloadTypes.enum.content_partner_collection
				]).options
			),
			containers
		)
	);
</script>

<Header {facets} search />

<div class="content-details masked-overflow">
	<div class="details">
		<Wall items={containers} addItem={() => {}} itemSnippet={partnerSnippet} />
	</div>
</div>

{#snippet partnerSnippet(item: Container)}
	<ContentPartnerCard container={item as ContentPartnerContainer} />
{/snippet}

<Help slug="content-partner-view" />

<style>
	.content-details {
		flex: 1;
		padding: 1rem;
	}
</style>
