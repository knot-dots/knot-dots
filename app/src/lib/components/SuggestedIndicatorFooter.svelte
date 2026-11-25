<script lang="ts">
	import { _ } from 'svelte-i18n';
	import RelevanceBadge from '$lib/components/RelevanceBadge.svelte';
	import type { BinaryIndicatorPayload, Container, IndicatorPayload } from '$lib/models';

	interface Props {
		container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
		relevance: number;
	}

	let { container, relevance }: Props = $props();
</script>

<p class="badges">
	{#each container.payload.indicatorCategory as indicatorCategory (indicatorCategory)}
		<span class="badge badge--indigo">{$_(indicatorCategory)}</span>
	{/each}
	<RelevanceBadge score={relevance} />
</p>

<style>
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
