<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import type { CategoryOption } from '$lib/categoryOptions';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import MultipleChoiceDisclosureOption from '$lib/components/MultipleChoiceDisclosureOption.svelte';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		editable?: boolean;
		label: string;
		offset?: [number, number];
		options: CategoryOption[];
		value: string[];
	}

	let { editable = false, label, offset = [0, 4], options, value = $bindable() }: Props = $props();

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

{#if editable || value.length > 1}
	<Dropdown {offset}>
		{#snippet button(popover)}
			<button
				{@attach tooltip(label)}
				class="dropdown-button dropdown-button--select"
				type="button"
				use:popover.button
			>
				{#each selectedEntries.slice(0, 1) as entry (entry.option.value)}
					<span class="badge badge--large badge--gray" class:value--child={entry.isChild}>
						<span class="truncated">{entry.option.label}</span>
					</span>
				{:else}
					<span class="badge badge--large badge--gray">
						{$_('empty')}
					</span>
				{/each}
				{#if value.length > 1}
					<span class="badge badge--large badge--gray">
						{$_('n_more', { values: { count: value.length - 1 } })}
					</span>
				{/if}
			</button>
		{/snippet}

		{#snippet panel()}
			{#if editable}
				<fieldset class="listbox">
					{#each options as option (option.value)}
						<MultipleChoiceDisclosureOption {option} bind:value {iconURL} />
					{/each}
				</fieldset>
			{:else}
				<ul>
					{#each selectedEntries as entry (entry.option.value)}
						<li>
							<span class="badge badge--gray">
								<span class="truncated">{entry.option.label}</span>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/snippet}
	</Dropdown>
{:else if value.length == 1}
	<span {@attach tooltip(label)} class="badge badge--large badge--gray">
		<span class="truncated">{selectedEntries[0].option.label}</span>
	</span>
{/if}

<style>
	li {
		display: flex;
		padding: 0.5rem 0.75rem;
	}

	.badge {
		min-width: 0;
	}
</style>
