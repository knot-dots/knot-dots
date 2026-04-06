<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import type { CategoryOption } from '$lib/categoryOptions';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import MultipleChoiceDisclosureOption from '$lib/components/MultipleChoiceDisclosureOption.svelte';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		options: CategoryOption[];
		value: string[];
	}

	let {
		compact = false,
		editable = false,
		labelledBy,
		offset = [0, 4],
		options,
		value = $bindable([])
	}: Props = $props();

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived.by(() => ({
		modifiers: [{ name: 'offset', options: { offset } }]
	}));

	type Option = (typeof options)[number];
	type SubOption = NonNullable<Option['subOptions']>[number];

	const selectedEntries = $derived.by(() => {
		if (!Array.isArray(value)) return [];
		const entries: Array<{
			option: Option | SubOption;
			isChild: boolean;
		}> = [];
		const groupedSubValues = new SvelteSet<string>();

		for (const option of options) {
			if (!value.includes(option.value)) continue;
			entries.push({ option, isChild: false });
			for (const sub of option.subOptions ?? []) {
				if (!value.includes(sub.value)) continue;
				entries.push({ option: sub, isChild: true });
				groupedSubValues.add(sub.value);
			}
		}

		for (const option of options) {
			for (const sub of option.subOptions ?? []) {
				if (!value.includes(sub.value) || groupedSubValues.has(sub.value)) continue;
				entries.push({ option: sub, isChild: true });
			}
		}

		return entries;
	});

	function iconURL(origin?: string) {
		if (!origin) return undefined;
		try {
			return transformFileURL(origin);
		} catch (error) {
			console.warn('Failed to transform icon URL', error);
			return origin;
		}
	}
</script>

{#if editable || (value.length > 1 && compact)}
	<div class="dropdown" use:popperRef>
		<button aria-labelledby={labelledBy} class="dropdown-button" type="button" use:popover.button>
			<span class="value" class:value--compact={compact}>
				{#each selectedEntries.slice(0, value.length > 1 && compact ? 1 : value.length) as entry (entry.option.value)}
					<span
						class="badge badge--gray truncated"
						class:value--compact={compact}
						class:value--child={entry.isChild}
					>
						<span class="truncated">{entry.option.label}</span>
					</span>
				{:else}
					{$_('empty')}
				{/each}
				{#if value.length > 1 && compact}
					<span class="badge badge--gray badge--more">
						{$_('n_more', { values: { count: value.length - 1 } })}
					</span>
				{/if}
			</span>
			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>
		{#if $popover.expanded}
			{#if editable}
				<fieldset
					aria-labelledby={labelledBy}
					class="dropdown-panel"
					use:popperContent={extraOpts}
					use:popover.panel
				>
					{#each options as option (option.value)}
						<MultipleChoiceDisclosureOption {option} bind:value {iconURL} />
					{/each}
				</fieldset>
			{:else}
				<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<ul>
						{#each selectedEntries as entry (entry.option.value)}
							<li>
								<span class="badge badge--gray">{entry.option.label}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</div>
{:else}
	<div class="value" class:value--compact={compact}>
		{#each selectedEntries.slice(0, compact ? 1 : value.length) as entry (entry.option.value)}
			<span class="badge badge--gray truncated">{entry.option.label}</span>
		{:else}
			{$_('empty')}
		{/each}
	</div>
{/if}

<style>
	.dropdown {
		--dropdown-button-align-items: start;
	}

	li {
		display: flex;
		padding: 0.5rem 0.75rem;
	}

	.badge {
		display: inline;
	}

	.value {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-width: 0;
	}

	.value.value--compact {
		flex-wrap: nowrap;
	}
</style>
