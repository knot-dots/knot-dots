<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { units } from '$lib/models';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		value: string;
	}

	let { editable = false, labelledBy, offset, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		{labelledBy}
		{offset}
		options={units.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value
	/>
{:else}
	<span class="valuey">{$_(value)}</span>
{/if}
