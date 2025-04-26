<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();
</script>

{#if label}
	<div class="label">{label}</div>
{/if}
{#if editable}
	<input class="value" onchange={requestSubmit} type="text" bind:value />
{:else}
	<div class="value">
		{value ?? $_('empty')}
	</div>
{/if}

<style>
	input {
		border: none;
	}
</style>
