<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';

	export let editable = false;
	export let label: string;
	export let value: string | undefined;

	let id = `date-${counter++}`;
</script>

{#if editable}
	<label class="label" for={id}>
		{label}
	</label>
	<span>
		<input {id} type="date" bind:value on:change={requestSubmit} />
	</span>
{:else}
	<span class="label">{label}</span>
	<time class="value" datetime={value}>
		{#if value}
			{$date(new Date(value), { format: 'long' })}
		{:else}
			&nbsp;
		{/if}
	</time>
{/if}

<style>
	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
		padding: 0.375rem;
		width: auto;
	}
</style>
