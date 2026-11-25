<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Check from '~icons/flowbite/check-outline';
	import ArrowCircleDownOutline from '~icons/knotdots/arrow-circle-down-outline';
	import ArrowCircleUpSolid from '~icons/knotdots/arrow-circle-up-solid';
	import seriesPreview from '$lib/assets/value-kind-series.svg';
	import {
		type ObjectiveOrEffectType,
		type ValueKind,
		valueKinds
	} from '$lib/objectiveOrEffectCreation';

	// A choice between kinds of values, each shown with a miniature of how they
	// are presented.
	interface Props {
		labelledBy: string;
		options: ValueKind[];
		// The type of the objective or effect the values are for.
		type: ObjectiveOrEffectType;
		value?: ValueKind;
	}

	let { labelledBy, options, type, value = $bindable() }: Props = $props();

	const id = $props.id();
</script>

<div aria-labelledby={labelledBy} class="options" role="radiogroup">
	{#each options as option (option)}
		<label class="option">
			<input
				aria-describedby="{id}-{option}-description"
				aria-labelledby="{id}-{option}-title"
				bind:group={value}
				class="is-visually-hidden"
				name={id}
				type="radio"
				value={option}
			/>

			<span class="preview">
				{#if option === valueKinds.enum.series}
					<img alt="" height="56" src={seriesPreview} width="80" />
				{:else if option === valueKinds.enum.tendency}
					<ArrowCircleUpSolid />
					<ArrowCircleDownOutline />
				{:else}
					<span class="switch"><span class="switch-indicator">{$_('yes')}</span></span>
				{/if}
			</span>

			<span class="text">
				<span class="title" id="{id}-{option}-title">
					{$_(`create_objective_or_effect_dialog.value_kind.${option}`)}
				</span>
				<span class="description" id="{id}-{option}-description">
					{$_(`create_objective_or_effect_dialog.value_kind_description.${type}.${option}`)}
				</span>
			</span>

			{#if value === option}
				<span class="check"><Check /></span>
			{/if}
		</label>
	{/each}
</div>

<style>
	.options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.option {
		align-items: center;
		background-color: var(--color-white);
		border: solid 1px var(--color-gray-200);
		border-radius: 12px;
		cursor: pointer;
		display: flex;
		gap: 0.75rem;
		min-height: 4.5rem;
		padding: 0.5rem;
	}

	.option:hover {
		background-color: color-mix(in srgb, var(--color-gray-400) 10%, transparent);
	}

	.option:has(input:focus-visible) {
		border-color: var(--color-primary-400);
		box-shadow: 0 0 0 1px var(--color-primary-400);
	}

	.option:has(input:checked) {
		background-color: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
	}

	.preview {
		align-items: center;
		background-color: var(--color-gray-025);
		border-radius: 4px;
		color: var(--color-gray-600);
		display: flex;
		flex-shrink: 0;
		height: 3.5rem;
		justify-content: center;
		overflow: clip;
		width: 5rem;
	}

	.preview > :global(svg) {
		height: 1.75rem;
		width: 1.75rem;
	}

	.switch {
		background-color: var(--color-gray-050);
		border: solid 1px var(--color-gray-200);
		border-radius: 9999px;
		display: flex;
		justify-content: flex-end;
		padding: 0.25rem;
		width: 3.75rem;
	}

	.switch-indicator {
		align-items: center;
		background-color: var(--color-gray-600);
		border-radius: 9999px;
		color: var(--color-white);
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		height: 1.25rem;
		justify-content: center;
		width: 2.25rem;
	}

	.text {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		gap: 0.125rem;
		line-height: 1.5;
		min-width: 0;
	}

	.title {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.description {
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		color: var(--color-gray-500);
		display: -webkit-box;
		font-size: 0.75rem;
		line-clamp: 2;
		overflow: hidden;
	}

	.check {
		color: var(--color-gray-700);
		display: flex;
		flex-shrink: 0;
	}

	.check > :global(svg) {
		height: 1rem;
		width: 1rem;
	}
</style>
