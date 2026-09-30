<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';

	export type MultipleChoiceTreeOption = {
		count?: number;
		disabled?: boolean;
		label: string;
		subOptions?: MultipleChoiceTreeOption[];
		value: string;
	};

	interface Props {
		disabled?: boolean;
		expandAll?: boolean;
		options: MultipleChoiceTreeOption[];
		selected: string[];
	}

	let {
		disabled = false,
		expandAll = false,
		options,
		selected = $bindable([] as string[])
	}: Props = $props();

	// Groups start expanded when they hold a selection or when there is
	// nothing else to see; afterwards the user is in charge.
	const expanded = new SvelteSet(
		untrack(() =>
			options
				.filter(
					(option) =>
						options.length === 1 ||
						option.subOptions?.some((subOption) => selected.includes(subOption.value))
				)
				.map(({ value }) => value)
		)
	);

	function isExpanded(option: MultipleChoiceTreeOption) {
		return expandAll || expanded.has(option.value);
	}

	function toggleExpanded(option: MultipleChoiceTreeOption) {
		if (expanded.has(option.value)) {
			expanded.delete(option.value);
		} else {
			expanded.add(option.value);
		}
	}

	function toggleSelection(value: string, checked: boolean) {
		selected = checked
			? selected.includes(value)
				? selected
				: [...selected, value]
			: selected.filter((v) => v !== value);
	}

	function selectableSubOptions(option: MultipleChoiceTreeOption) {
		return (option.subOptions ?? []).filter((subOption) => !subOption.disabled);
	}

	function allSubOptionsSelected(option: MultipleChoiceTreeOption) {
		return selectableSubOptions(option).every(({ value }) => selected.includes(value));
	}

	function selectSubOptions(option: MultipleChoiceTreeOption) {
		selected = [
			...selected,
			...selectableSubOptions(option)
				.map(({ value }) => value)
				.filter((value) => !selected.includes(value))
		];
	}
</script>

<ul class="tree">
	{#each options as option (option.value)}
		{@const subOptions = option.subOptions ?? []}
		{@const open = subOptions.length > 0 && isExpanded(option)}
		<li>
			<div class="option" class:option--expanded={open}>
				<label>
					<input
						checked={selected.includes(option.value)}
						disabled={disabled || option.disabled}
						onchange={(event) =>
							toggleSelection(option.value, (event.currentTarget as HTMLInputElement).checked)}
						type="checkbox"
						value={option.value}
					/>
					<span class="truncated">{option.label}</span>
					{#if option.count !== undefined}
						<span class="counter">({option.count})</span>
					{/if}
				</label>
				{#if subOptions.length > 0}
					{#if open}
						<button
							class="select-all"
							disabled={disabled || allSubOptionsSelected(option)}
							onclick={() => selectSubOptions(option)}
							type="button"
						>
							{$_('all')}
						</button>
					{/if}
					<button
						aria-expanded={open}
						class="action-button action-button--padding-tight suboption-button"
						{disabled}
						onclick={() => toggleExpanded(option)}
						type="button"
					>
						{#if open}<ChevronUp />{:else}<ChevronDown />{/if}
						<span class="is-visually-hidden">{$_('filter.show_suboptions')} {option.label}</span>
					</button>
				{/if}
			</div>
			{#if open}
				<ul class="sub-options">
					{#each subOptions as subOption (subOption.value)}
						<li>
							<label class="option option--sub">
								<input
									checked={selected.includes(subOption.value)}
									disabled={disabled || subOption.disabled}
									onchange={(event) =>
										toggleSelection(
											subOption.value,
											(event.currentTarget as HTMLInputElement).checked
										)}
									type="checkbox"
									value={subOption.value}
								/>
								<span class="truncated">{subOption.label}</span>
								{#if subOption.count !== undefined}
									<span class="counter">({subOption.count})</span>
								{/if}
							</label>
						</li>
					{/each}
				</ul>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.tree,
	.sub-options {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.sub-options {
		padding-left: 1.5rem;
	}

	.option {
		align-items: center;
		border-radius: 8px;
		color: var(--color-text-default);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding: 0.5rem;
	}

	.option--expanded,
	.option:hover {
		background-color: var(--color-background-accent-hover);
	}

	.option > label,
	label.option {
		align-items: center;
		display: flex;
		flex: 1;
		gap: 0.5rem;
		min-width: 0;
	}

	.option--sub {
		font-weight: 400;
	}

	.counter {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.select-all {
		background: none;
		border: none;
		color: var(--color-text-accent-default);
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 500;
		min-height: 1.75rem;
		padding: 0 0.625rem;
	}

	.select-all:disabled {
		background: none;
		color: var(--color-text-disabled);
	}

	.suboption-button {
		flex-shrink: 0;
	}
</style>
