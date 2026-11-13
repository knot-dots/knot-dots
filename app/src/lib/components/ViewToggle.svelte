<script lang="ts" generics="T extends string">
	import type { Component } from 'svelte';

	interface Props {
		label: string;
		name: string;
		onchange: (value: T, event: Event) => void;
		options: Array<{ icon?: Component; label: string; value: T }>;
		value: T;
	}

	let { label, name, onchange, options, value }: Props = $props();

	const id = $props.id();
</script>

<span class="view-toggle-label" id="{id}-label">{label}</span>
<div aria-labelledby="{id}-label" class="view-toggle" role="radiogroup">
	{#each options as option (option.value)}
		<label class="view-toggle-item">
			<input
				checked={option.value === value}
				class="is-visually-hidden"
				{name}
				onchange={(event) => onchange(option.value, event)}
				type="radio"
				value={option.value}
			/>
			{#if option.icon}
				<option.icon aria-hidden="true" />
			{/if}
			<span>{option.label}</span>
		</label>
	{/each}
</div>

<style>
	.view-toggle-label {
		color: var(--color-text-subtle);
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		padding: 0.5rem 0.5rem 0.25rem;
	}

	/* The track is gray-100 as in the design; --color-background-accent-subtle is lighter in code. */
	.view-toggle {
		background-color: var(--color-gray-100);
		border-radius: 0.5rem;
		display: flex;
		gap: 2px;
		padding: 2px;
	}

	.view-toggle-item {
		align-items: center;
		border-radius: 6px;
		color: var(--color-text-accent-subtle);
		cursor: pointer;
		display: flex;
		flex: 1 0 0;
		font-size: 0.75rem;
		font-weight: 500;
		gap: 0.25rem;
		justify-content: center;
		line-height: 1.5;
		min-height: 1.5rem;
		min-width: 1px;
		padding: 0 0.5rem;
	}

	.view-toggle-item:has(:global(svg)) {
		padding-left: 6px;
	}

	.view-toggle-item :global(svg) {
		color: var(--color-icon-accent-subtle);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.view-toggle-item:hover {
		background-color: var(--color-background-accent-hover);
		color: var(--color-text-accent-default);
	}

	.view-toggle-item:hover :global(svg) {
		color: var(--color-icon-accent-default);
	}

	.view-toggle-item:has(input:checked) {
		background-color: var(--color-background-accent-white);
		box-shadow: var(--shadow-sm);
		color: var(--color-text-accent-strong);
	}

	.view-toggle-item:has(input:checked) :global(svg) {
		color: var(--color-icon-accent-strong);
	}

	.view-toggle-item:has(input:focus-visible) {
		outline: 2px solid var(--focus-color);
		outline-offset: -2px;
	}
</style>
