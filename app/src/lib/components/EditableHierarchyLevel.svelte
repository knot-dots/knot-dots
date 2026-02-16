<script lang="ts">
	import { _, number } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		label?: string;
		value: number;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();
</script>

{#if editable}
	{#if label}
		<label class="label" for="hierarchyLevel">{label}</label>
	{/if}
	<input class="value" id="hierarchyLevel" max="6" min="1" required type="number" bind:value />
{:else}
	{#if label}
		<span class="label">{label}</span>
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
