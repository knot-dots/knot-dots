<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<label class="label" for="unit">
		{$_('unit')}
	</label>
	<input class="value" id="unit" name="unit" type="text" bind:value />
{:else}
	<span class="label">{$_('unit')}</span>
	<span class="value">{value || $_('empty')}</span>
{/if}

<style>
	input {
		border: none;
	}
</style>
