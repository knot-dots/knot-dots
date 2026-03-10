<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import transformFileURL from '$lib/transformFileURL';
	import type { CategoryOption } from '$lib/client/categoryOptions';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		labelledBy?: string;
		options: CategoryOption[];
		value: string[];
	}

	let {
		compact = false,
		editable = false,
		labelledBy,
		options,
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

	function iconURL(origin?: string): string | undefined {
		if (!origin) return undefined;
		try {
			return transformFileURL(origin);
		} catch {
			return origin;
		}
	}

	const allHaveIcons = $derived(
		value.length > 0 && value.every((v) => iconURL(findOption(v)?.icon) != null)
	);
</script>

{#if editable}
	<MultipleChoiceDropdown
		{compact}
		iconOnly
		{labelledBy}
		offset={[-41, -39]}
		{options}
		bind:value
	/>
{:else if value?.length > 0}
	{#if allHaveIcons}
		<p class="inline-values">
			{#each value as v (v)}
				{@const opt = findOption(v)}
				<img class="badge-icon" src={iconURL(opt?.icon)} alt={opt?.label ?? v} />
			{/each}
		</p>
	{:else if compact && value.length > 1}
		{@const first = findOption(value[0])}
		{@const firstIcon = iconURL(first?.icon)}
		<p class="compact-values">
			{#if firstIcon}
				<img class="badge-icon" src={firstIcon} alt={first?.label ?? value[0]} />
			{:else}
				<span class="badge badge--gray first-value"
					><span class="first-value-text">{first?.label ?? value[0]}</span></span
				>
			{/if}
			<span class="badge badge--gray badge--more">
				{$_('n_more', { values: { count: value.length - 1 } })}
			</span>
		</p>
	{:else}
		<p class="inline-values">
			{#each value as v, i (v)}
				{@const opt = findOption(v)}
				{@const icon = iconURL(opt?.icon)}
				{#if icon}
					<img class="badge-icon" src={icon} alt={opt?.label ?? v} />
				{:else}
					{#if i > 0},
					{/if}
					{opt?.label ?? v}
				{/if}
			{/each}
		</p>
	{/if}
{/if}

<style>
	.inline-values {
		align-items: center;
		display: flex;
		gap: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge-icon {
		flex-shrink: 0;
		height: 1.5rem;
		object-fit: fill;
		vertical-align: middle;
		width: 1.5rem;
	}

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
