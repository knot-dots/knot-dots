<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import ContentPartnerCard from '$lib/components/ContentPartnerCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		type ContentPartnerContainer,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let facets = $derived(
		computeFacetCount(
			new Map([
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
			]),
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
