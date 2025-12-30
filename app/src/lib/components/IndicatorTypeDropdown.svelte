<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { indicatorTypes } from '$lib/models';

	interface Props {
		value: string[];
		editable?: boolean;
	}

	let { value = $bindable(), editable = false }: Props = $props();

	const options = $derived(indicatorTypes.options.map((opt) => ({ label: $_(opt), value: opt })));
</script>

{#if editable}
	<MultipleChoiceDropdown offset={[0, -39]} compact {options} bind:value />
{:else}
	<span class="value">{value?.map((v) => $_(v)).join(', ')}</span>
{/if}
