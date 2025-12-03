<script lang="ts">
	import { _, number } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: number;
		showLabel?: boolean; // allow consumers (e.g. table rows) to hide the label
	}

	let { editable = false, value = $bindable(), showLabel = true }: Props = $props();
</script>

{#if editable}
	{#if showLabel}
		<label class="label" for="hierarchyLevel">
			{$_('goal.hierarchy_level')}
		</label>
	{/if}
	<input class="value" max="6" min="1" required type="number" bind:value />
{:else}
	{#if showLabel}
		<span class="label">{$_('goal.hierarchy_level')}</span>
	{/if}
	<span class="value">{value ? $number(value) : $_('empty')}</span>
{/if}

<style>
	input[type='number'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
		padding: 0.375rem;
		width: auto;
	}
</style>
