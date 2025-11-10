<script lang="ts">
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import {
		units as unitEnum,
		type IndicatorContainer,
		type IndicatorTemplateContainer,
		type AnyContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import { _ } from 'svelte-i18n';

	// Units aren't enumerated like types; supply via parent or fallback.
	interface Props {
		value: string | undefined;
		container?: IndicatorContainer | IndicatorTemplateContainer | AnyContainer | null;
		editable?: boolean;
	}

	let { value = $bindable(), container = null, editable = false }: Props = $props();

	// Build options from enum and include current value if it's a custom unit (non-empty)
	const options = $derived.by(() => {
		const base = unitEnum.options as readonly string[];
		const withCurrent = value && value !== '' && !base.includes(value) ? [...base, value] : base;
		return [
			{ label: $_('empty'), value: null },
			...withCurrent.map((u) => ({ label: $_(u), value: u }))
		];
	});
</script>

{#if editable && (!container || $ability.can('update', container, 'payload.unit'))}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value />
{:else}
	<span class="readonly">{value ? $_(value) : ''}</span>
{/if}

<style>
	.readonly {
		display: inline-block;
		min-width: 2rem;
	}
</style>
