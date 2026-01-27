<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type ProgramType, programTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		value: ProgramType;
	}

	let { editable = false, labelledBy, value = $bindable() }: Props = $props();

	const options = $derived(programTypes.options.map((o) => ({ label: $_(o), value: o })));
</script>

{#if editable}
	<SingleChoiceDropdown {labelledBy} offset={[0, -39]} {options} bind:value />
{:else}
	<span class="value">{$_(value)}</span>
{/if}
