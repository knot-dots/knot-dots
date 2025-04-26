<script lang="ts">
	import { _, number } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: number | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<label class="label" for="amount">
		{$_('amount')}
	</label>
	<input class="value" id="amount" inputmode="numeric" name="amount" type="text" bind:value />
{:else}
	<span class="label">{$_('amount')}</span>
	<span class="value">
		{value ? $number(value) : $_('empty')}
	</span>
{/if}

<style>
	input {
		border: none;
	}
</style>
