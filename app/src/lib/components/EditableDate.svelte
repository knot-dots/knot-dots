<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import { _, date } from 'svelte-i18n';

	export let editable = false;
	export let label: string;
	export let value: string | undefined;

	let id = `date-${counter++}`;
</script>

<p class="tabular">
	{#if editable}
		<label for={id}>
			{label}
		</label>
		<span><input {id} type="date" bind:value /></span>
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
</p>

<style>
	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 3rem;
		width: auto;
	}
</style>
