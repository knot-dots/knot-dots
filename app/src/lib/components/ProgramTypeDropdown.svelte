<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type ProgramType, programTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: ProgramType;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const options = $derived(programTypes.options.map((o) => ({ label: $_(o), value: o })));
</script>

{#if editable}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value />
{:else}
	<span class="value">{$_(value)}</span>
{/if}
