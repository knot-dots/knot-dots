<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { cardStyles } from '$lib/models';

	interface Props {
		editable: boolean;
		labelledBy?: string;
		value?: string;
	}

	let { editable = false, labelledBy, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		{labelledBy}
		offset={[-41, -39]}
		options={cardStyles.options.map((o) => ({ value: o, label: $_(`card_style.${o}`) }))}
		bind:value
	/>
{:else}
	<span>{$_(`card_style.${value}`)}</span>
{/if}

<style>
	span {
		white-space: nowrap;
	}
</style>
