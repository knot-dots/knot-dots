<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { visibility } from '$lib/models';

	interface Props {
		editable: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		offset={[-41, -39]}
		options={visibility.options.map((o) => ({ value: o, label: $_(`visibility.${o}`) }))}
		bind:value
	/>
{:else}
	<span>{$_(`visibility.${value}`)}</span>
{/if}

<style>
	span {
		white-space: nowrap;
	}
</style>
