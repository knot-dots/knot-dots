<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';

	export let editable = false;
	export let label: string;
	export let value: number | undefined;

	let id = `number-${counter++}`;
</script>

{#if editable}
	<label class="label" for={id}>
		{label}
	</label>
	<span>
		<input {id} type="number" bind:value on:change={requestSubmit} />
	</span>
{:else}
	<span class="label">{label}</span>
	<span class="value">
		{#if value}
			{$number(value)}
		{:else}
			&nbsp;
		{/if}
	</span>
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
