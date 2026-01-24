<script lang="ts">
	import { type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import type { Container, IndicatorTemplatePayload } from '$lib/models';

	interface Props {
		button?: Snippet;
		container: Container<IndicatorTemplatePayload>;
	}

	let { button, container }: Props = $props();
</script>

<Card {button} {container}>
	{#snippet body()}
		<Summary {container} />

		<p class="badges">
			{#each container.payload.indicatorType as indicatorType (indicatorType)}
				<span class="badge">{$_(indicatorType)}</span>
			{/each}

			{#each container.payload.indicatorCategory as indicatorCategory (indicatorCategory)}
				<span class="badge">{$_(indicatorCategory)}</span>
			{/each}
		</p>
	{/snippet}
</Card>

<style>
	.badges {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
