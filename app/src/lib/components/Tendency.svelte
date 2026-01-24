<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowCircleDownSolid from '~icons/knotdots/arrow-circle-down-solid';
	import ArrowCircleUpSolid from '~icons/knotdots/arrow-circle-up-solid';
	import {
		type EffectContainer,
		isContainerWithPayloadType,
		type ObjectiveContainer,
		payloadTypes
	} from '$lib/models';

	interface Props {
		container: EffectContainer | ObjectiveContainer;
	}

	let { container }: Props = $props();

	const trendValueUpLabel = $derived(
		isContainerWithPayloadType(payloadTypes.enum.effect, container)
			? $_('effect.trend_value_up')
			: $_('objective.trend_value_up')
	);
	const trendValueDownLabel = $derived(
		isContainerWithPayloadType(payloadTypes.enum.effect, container)
			? $_('effect.trend_value_down')
			: $_('objective.trend_value_down')
	);
</script>

{#if 'trendValue' in container.payload}
	<p>
		{#if container.payload.trendValue === 1}
			<ArrowCircleUpSolid />
			<span>{trendValueUpLabel}</span>
		{:else}
			<ArrowCircleDownSolid />
			<span>{trendValueDownLabel}</span>
		{/if}
	</p>
{/if}

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
