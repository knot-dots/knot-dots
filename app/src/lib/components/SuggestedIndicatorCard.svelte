<script lang="ts">
	import SuggestedIndicatorBody from '$lib/components/SuggestedIndicatorBody.svelte';
	import SuggestedIndicatorFooter from '$lib/components/SuggestedIndicatorFooter.svelte';
	import type {
		ActualDataPayload,
		BinaryIndicatorPayload,
		Container,
		IndicatorPayload
	} from '$lib/models';

	// A suggested indicator once it has been chosen, shown like the card it was
	// chosen from, but no longer selectable.
	interface Props {
		actualData: Container<ActualDataPayload>[];
		container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
		relevance: number;
	}

	let { actualData, container, relevance }: Props = $props();
</script>

<article class="card">
	<h3>{container.payload.title}</h3>
	<div class="body">
		<SuggestedIndicatorBody {actualData} {container} />
	</div>
	<footer>
		<SuggestedIndicatorFooter {container} {relevance} />
	</footer>
</article>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: var(--card-border-radius);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		hyphens: auto;
		padding: 1rem;
		word-break: break-word;
	}

	h3 {
		color: var(--color-gray-900);
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0;
	}

	.body {
		color: var(--color-gray-500);
		display: flex;
		flex-direction: column;
		font-size: 0.875rem;
		font-weight: 400;
	}
</style>
