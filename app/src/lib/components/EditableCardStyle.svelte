<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CardStyleDropdown from '$lib/components/CardStyleDropdown.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

{#if label}
	<div class="label" {id}>{label}</div>
{/if}
{#if editable}
	<CardStyleDropdown labelledBy={label ? id : undefined} {editable} bind:value />
{:else}
	<div class="value">
		{$_(`card_style.${value}`) ?? $_('empty')}
	</div>
{/if}
