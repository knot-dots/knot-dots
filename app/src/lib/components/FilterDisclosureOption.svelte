<script lang="ts">
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDownSmall from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUpSmall from '~icons/heroicons/chevron-up-16-solid';
	import transformFileURL from '$lib/transformFileURL';

	type OptionWithSub = {
		count?: number;
		value: string;
		label: string;
		icon?: string;
		subOptions?: OptionWithSub[];
	};

	interface Props {
		option: OptionWithSub;
		selected: string[];
		apply: () => void;
	}

	let { option, selected = $bindable([] as string[]), apply }: Props = $props();

	const disclosure = createDisclosure({});
	const selectedSubCount = $derived.by(
		() => option.subOptions?.filter((sub) => selected.includes(sub.value)).length ?? 0
	);
	const hasSelectedSubOptions = $derived.by(() => selectedSubCount > 0);

	function iconURL(origin?: string) {
		if (!origin) return undefined;
		try {
			return transformFileURL(origin);
		} catch (error) {
			console.warn('Failed to transform icon URL', error);
			return origin;
		}
	}

	function toggleSelection(entryValue: string, checked: boolean) {
		const current = Array.isArray(selected) ? selected : [];
		selected = checked
			? current.includes(entryValue)
				? current
				: [...current, entryValue]
			: current.filter((value) => value !== entryValue);
		apply();
	}
</script>

<div class="option" role="presentation">
	<label>
		<input
			type="checkbox"
			value={option.value}
			checked={selected.includes(option.value)}
			onchange={(event) =>
				toggleSelection(option.value, (event.currentTarget as HTMLInputElement).checked)}
		/>
		<span class="option-label">
			{#if option.icon}
				<img class="option-icon" src={iconURL(option.icon)} alt="" />
			{/if}
			{option.label}
			{#if option.count !== undefined}
				<span class="counter">({option.count})</span>
			{/if}
		</span>
	</label>
	{#if option.subOptions?.length}
		<button
			type="button"
			class="suboption-button"
			use:disclosure.button
			aria-label={$_('filter.show_suboptions')}
		>
			<span
				class="suboption-dot"
				class:suboption-dot--active={hasSelectedSubOptions}
				aria-hidden="true"
			></span>
			{#if $disclosure.expanded}
				<ChevronUpSmall class="suboption-indicator" aria-hidden="true" />
			{:else}
				<ChevronDownSmall class="suboption-indicator" aria-hidden="true" />
			{/if}
		</button>
	{/if}
</div>
{#if option.subOptions?.length && $disclosure.expanded}
	<div class="suboptions-list" role="presentation" use:disclosure.panel>
		{#each option.subOptions as sub (sub.value)}
			<label class="option option--suboption">
				<input
					type="checkbox"
					value={sub.value}
					checked={selected.includes(sub.value)}
					onchange={(event) =>
						toggleSelection(sub.value, (event.currentTarget as HTMLInputElement).checked)}
				/>
				<span class="option-label">
					{#if sub.icon}
						<img class="option-icon" src={iconURL(sub.icon)} alt="" />
					{/if}
					{sub.label}
					{#if sub.count !== undefined}
						<span class="counter">({sub.count})</span>
					{/if}
				</span>
			</label>
		{/each}
	</div>
{/if}

<style>
	.counter {
		color: var(--color-gray-500);
	}

	:global(.suboption-indicator) {
		height: 1rem;
		width: 1rem;
		color: var(--color-gray-700);
	}

	.suboption-button {
		background: none;
		border: none;
		padding: 0.25rem;
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		color: inherit;
		cursor: pointer;
		border-radius: 6px;
	}

	.option > label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex: 1;
	}

	.suboption-button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.suboption-dot {
		background: transparent;
		border-radius: 999px;
		height: 0.5rem;
		width: 0.5rem;
		border: 1px solid transparent;
	}

	.suboption-dot--active {
		background: var(--color-primary-600);
		border-color: var(--color-primary-600);
	}

	.option {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.option-label {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
		line-height: 1.5;
	}

	.option-icon {
		height: 1rem;
		width: 1rem;
		object-fit: contain;
		margin-left: 0.15rem;
		margin-right: 0.15rem;
	}

	.option--suboption {
		opacity: 0.85;
	}

	.suboptions-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.25rem 0 0.5rem 1.5rem;
	}
</style>
