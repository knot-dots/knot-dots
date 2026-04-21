<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { indicatorCategories } from '$lib/models';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		value: string[];
	}

	let { editable = false, labelledBy, offset, value = $bindable() }: Props = $props();

	const options = $derived(
		indicatorCategories.options.map((opt) => ({ label: $_(opt), value: opt }))
	);
</script>

{#if editable}
	<MultipleChoiceDropdown {labelledBy} {offset} compact {options} bind:value />
{:else}
	<span class="value">{value?.map((v) => $_(v)).join(', ')}</span>
{/if}
