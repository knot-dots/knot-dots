<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import KnowledgeCard from '$lib/components/KnowledgeCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		type KnowledgeContainer,
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
				['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
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
		<Wall items={containers} addItem={() => {}} itemSnippet={knowledgeSnippet} />
	</div>
</div>

{#snippet knowledgeSnippet(item: Container)}
	<KnowledgeCard container={item as KnowledgeContainer} />
{/snippet}

<Help slug="knowledge-view" />

<style>
	.content-details {
		flex: 1;
		padding: 1rem;
	}
</style>
