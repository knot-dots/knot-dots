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
	<div class="value">{value ? $number(value) : $_('empty')}</div>
{/if}

<style>
	input[type='number'] {
		display: inline-flex;
		max-height: 2.25rem;
		width: auto;
	}
</style>
