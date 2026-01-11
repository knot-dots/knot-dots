<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { linkStyles } from '$lib/models';

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
		options={linkStyles.options.map((o) => ({ value: o, label: $_(`link_style.${o}`) }))}
		bind:value
	/>
{:else}
	<span>{$_(`link_style.${value}`)}</span>
{/if}

<style>
	span {
		white-space: nowrap;
	}
</style>
