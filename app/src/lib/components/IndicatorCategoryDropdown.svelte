<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { indicatorCategories } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const options = $derived(
		indicatorCategories.options.map((opt) => ({ label: $_(opt), value: opt }))
	);
</script>

{#if editable}
	<MultipleChoiceDropdown offset={[0, -39]} compact {options} bind:value />
{:else}
	<span class="value">{value?.map((v) => $_(v)).join(', ')}</span>
{/if}
