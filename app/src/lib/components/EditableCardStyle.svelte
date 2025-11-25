<script lang="ts">
	import { _ } from 'svelte-i18n';
    import CardStyleDropdown from "$lib/components/CardStyleDropdown.svelte";

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

	<CardStyleDropdown
			{editable}
			bind:value={value}
	/>

{:else}
	<div class="value">
		{$_(`card_style.${value}`) ?? $_('empty')}
	</div>
{/if}

<style>
	input {
		border: none;
	}
</style>
