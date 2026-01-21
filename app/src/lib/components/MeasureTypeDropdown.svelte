<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { measureTypes } from '$lib/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		labelledBy?: string;
		value: string[];
	}

	let { compact = false, editable = false, labelledBy, value = $bindable() }: Props = $props();

	const options = $derived(measureTypes.options.map((o) => ({ label: $_(o), value: o })));

	let display = $derived(value.map((v) => $_(v)).join(', '));
</script>

{#if editable}
	<MultipleChoiceDropdown {labelledBy} {options} {compact} offset={[-41, -39]} bind:value />
{:else}
	<span class="value">{value.length ? display : $_('empty')}</span>
{/if}
