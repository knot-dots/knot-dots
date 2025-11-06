<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { measureTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string[]; // payload.measureType (array) — we expose as single-choice UI
	}

	let { editable = false, value = $bindable() }: Props = $props();

	// Internal single value, mapped to first (or none) of array
	let internal = $state<string | null>(value[0] ?? null);

	// Sync internal from external changes
	$effect(() => {
		internal = value[0] ?? null;
	});

	// Write back as one-element array (or empty)
	$effect(() => {
		value = internal ? [internal] : [];
	});

	const options = $derived(measureTypes.options.map((o) => ({ label: $_(o), value: o })));
</script>

{#if editable}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value={internal} />
{:else}
	<span class="value">{internal ? $_(internal) : $_('empty')}</span>
{/if}
