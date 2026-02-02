<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type MeasureType, measureTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		value?: MeasureType;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const options = $derived(measureTypes.options.map((o) => ({ label: $_(o), value: o })));
</script>

{#if editable}
	<SingleChoiceDropdown {options} offset={[0, -39]} bind:value />
{:else}
	<span class="value">{value ? $_(value) : $_('empty')}</span>
{/if}
