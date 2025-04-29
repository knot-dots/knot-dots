<script lang="ts">
	import { _, number } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: number;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<label class="label" for="hierarchyLevel">
		{$_('goal.hierarchy_level')}
	</label>
	<input class="value" max="6" min="1" required type="number" bind:value />
{:else}
	<span class="label">{$_('goal.hierarchy_level')}</span>
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
