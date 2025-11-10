<script lang="ts">
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { indicatorTypes } from '$lib/models';
	import { ability } from '$lib/stores';
	import { _ } from 'svelte-i18n';
	import type { IndicatorContainer, IndicatorTemplateContainer, AnyContainer } from '$lib/models';

	interface Props {
		value: string[];
		container?: IndicatorContainer | IndicatorTemplateContainer | AnyContainer | null;
		editable?: boolean;
	}

	let { value = $bindable(), container = null, editable = false }: Props = $props();

	const options = $derived(indicatorTypes.options.map((opt) => ({ label: $_(opt), value: opt })));
</script>

{#if editable && (!container || $ability.can('update', container, 'payload.indicatorType'))}
	<MultipleChoiceDropdown offset={[0, -39]} compact {options} bind:value />
{:else}
	<span class="readonly">{value?.map((v) => $_(v)).join(', ')}</span>
{/if}

<style>
	.readonly {
		display: inline-block;
		min-width: 2rem;
	}
</style>
