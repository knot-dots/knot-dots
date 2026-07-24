<script lang="ts">
	import { _, number } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		label: string;
		value?: number;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

{#if editable}
	<label class="label" for={id}>
		{label}
	</label>
	<span>
		<input {id} type="number" bind:value />
	</span>
{:else}
	<span class="label">{label}</span>
	<span class="value">
		{#if value}
			{$number(value)}
		{:else}
			{$_('empty')}
		{/if}
	</span>
{/if}

<style>
	input[type='number'] {
		display: inline-flex;
		max-height: 2.25rem;
		width: auto;
	}
</style>
