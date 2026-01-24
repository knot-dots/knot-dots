<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowCircleDownOutline from '~icons/knotdots/arrow-circle-down-outline';
	import ArrowCircleDownSolid from '~icons/knotdots/arrow-circle-down-solid';
	import ArrowCircleUpOutline from '~icons/knotdots/arrow-circle-up-outline';
	import ArrowCircleUpSolid from '~icons/knotdots/arrow-circle-up-solid';
	import {
		type Container,
		type EffectPayload,
		isContainerWithPayloadType,
		type ObjectivePayload,
		payloadTypes
	} from '$lib/models';

	interface Props {
		container: Container<EffectPayload> | Container<ObjectivePayload>;
		editable?: boolean;
	}

	let { container, editable = false }: Props = $props();

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

{#if editable}
	<div class="segmented-button segmented-button--vertical">
		<label class="button">
			{#if container.payload.trendValue === 1}
				<ArrowCircleUpSolid />
			{:else}
				<ArrowCircleUpOutline />
			{/if}

			<span class="truncated">{trendValueUpLabel}</span>

			<input bind:group={container.payload.trendValue} name="trendValue" type="radio" value={1} />
		</label>

		<label class="button">
			{#if container.payload.trendValue === -1}
				<ArrowCircleDownSolid />
			{:else}
				<ArrowCircleDownOutline />
			{/if}

			<span class="truncated">{trendValueDownLabel}</span>

			<input bind:group={container.payload.trendValue} name="trendValue" type="radio" value={-1} />
		</label>
	</div>
{:else}
	<div class="segmented-button segmented-button--vertical segmented-button--readonly">
		<span class="button" class:button--selected={container.payload.trendValue == 1}>
			{#if container.payload.trendValue === 1}
				<ArrowCircleUpSolid />
			{:else}
				<ArrowCircleUpOutline />
			{/if}

			<span class="truncated">{trendValueUpLabel}</span>
		</span>

		<span class="button" class:button--selected={container.payload.trendValue == -1}>
			{#if container.payload.trendValue === -1}
				<ArrowCircleDownSolid />
			{:else}
				<ArrowCircleDownOutline />
			{/if}

			<span class="truncated">{trendValueDownLabel}</span>
		</span>
	</div>
{/if}

<style>
	.segmented-button {
		--segmented-button-selected-background-color: var(--color-teal-100);
		--segmented-button-selected-border-color: var(--color-teal-200);
		--segmented-button-selected-color: var(--color-teal-900);

		margin-top: 0.5rem;
	}

	.segmented-button.segmented-button--readonly .button {
		--button-active-background: none;
		--button-hover-background: none;
	}

	.segmented-button > .button.button--selected {
		background-color: var(--segmented-button-selected-background-color);
	}

	p {
		align-items: center;
		display: flex;
		margin-top: 0.5rem;
	}
</style>
