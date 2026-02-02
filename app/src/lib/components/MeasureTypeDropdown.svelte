<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type MeasureType, measureTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		value?: MeasureType[];
	}

	let { editable = false, value = $bindable([]) }: Props = $props();

	const selected = $derived(value?.[0]);

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement | null;
		const next = (target?.value || undefined) as MeasureType | undefined;
		value = next ? [next] : [];
	}

	const options = $derived(measureTypes.options.map((o) => ({ label: $_(o), value: o })));
</script>

{#if editable}
	<SingleChoiceDropdown {options} offset={[0, -39]} value={selected} on:change={handleChange} />
{:else}
	<span class="value">{selected ? $_(selected) : $_('empty')}</span>
{/if}
