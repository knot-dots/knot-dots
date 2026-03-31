<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import type { CategoryOption } from '$lib/client/categoryOptions';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		labelledBy?: string;
		options: CategoryOption[];
		showSelectedIcons?: boolean;
		value: string[];
	}

	let {
		compact = false,
		editable = false,
		labelledBy,
		options,
		showSelectedIcons = true,
		value = $bindable([])
	}: Props = $props();

	function findOption(v: string): CategoryOption | undefined {
		for (const o of options) {
			if (o.value === v) return o;
			for (const s of o.subOptions ?? []) {
				if (s.value === v) return s;
			}
		}
		return undefined;
	}
</script>

{#if editable}
	<MultipleChoiceDropdown
		{compact}
		iconOnly={showSelectedIcons}
		{showSelectedIcons}
		{labelledBy}
		offset={[-41, -39]}
		{options}
		bind:value
	/>
{:else if value?.length > 0}
	{#if value.length === 1}
		{@const first = findOption(value[0])}
		<p class="compact-values">
			<span class="badge badge--gray first-value"
				><span class="first-value-text">{first?.label ?? value[0]}</span></span
			>
		</p>
	{:else if compact && value.length > 1}
		{@const first = findOption(value[0])}
		<p class="compact-values">
			<span class="badge badge--gray first-value"
				><span class="first-value-text">{first?.label ?? value[0]}</span></span
			>
			<span class="badge badge--gray badge--more">
				{$_('n_more', { values: { count: value.length - 1 } })}
			</span>
		</p>
	{/if}
{/if}

<style>
	.compact-values {
		align-items: center;
		display: flex;
		gap: 0.25rem;
		min-width: 0;
	}

	.first-value {
		min-width: 0;
	}

	.first-value-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.compact-values > :global(.badge--more) {
		flex-shrink: 0;
	}
</style>
