<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowCircleDownSolid from '~icons/knotdots/arrow-circle-down-solid';
	import ArrowCircleUpSolid from '~icons/knotdots/arrow-circle-up-solid';
	import { type EffectContainer, isEffectContainer, type ObjectiveContainer } from '$lib/models';

	interface Props {
		container: EffectContainer | ObjectiveContainer;
	}

	let { container }: Props = $props();

	const trendValueUpLabel = $derived(
		isEffectContainer(container) ? $_('effect.trend_value_up') : $_('objective.trend_value_up')
	);
	const trendValueDownLabel = $derived(
		isEffectContainer(container) ? $_('effect.trend_value_down') : $_('objective.trend_value_down')
	);
</script>

<p>
	{#if container.payload.trendValue == 1}
		<ArrowCircleUpSolid />
		<span>{trendValueUpLabel}</span>
	{:else}
		<ArrowCircleDownSolid />
		<span>{trendValueDownLabel}</span>
	{/if}
</p>

<style>
	p {
		align-items: center;
		color: var(--color-gray-900);
		display: flex;
	}

	p :global(svg) {
		flex-shrink: 0;
		height: 2.25rem;
		width: 2.25rem;
	}
</style>
