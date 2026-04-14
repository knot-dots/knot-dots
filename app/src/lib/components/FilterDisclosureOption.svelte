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
		apply?: () => void;
	}

	let { option, selected = $bindable([] as string[]), apply = () => {} }: Props = $props();

	const disclosure = createDisclosure({ label: $_('filter.show_suboptions') });
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
			<span class="truncated">{option.label}</span>
			{#if option.count !== undefined}
				<span class="counter">({option.count})</span>
			{/if}
		</span>
	</label>
	{#if option.subOptions?.length}
		<button
			type="button"
			class="action-button action-button--size-l suboption-button"
			use:disclosure.button
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
					<span class="truncated">{sub.label}</span>
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
		height: 1.25rem;
		width: 1.25rem;
		color: var(--color-gray-500);
	}

	.suboption-button {
		align-items: center;
		display: inline-flex;
		margin-left: auto;
		position: relative;
	}

	.option > label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.suboption-dot {
		background: transparent;
		border-radius: 999px;
		height: 0.5rem;
		width: 0.5rem;
		border: 1px solid transparent;
		position: absolute;
		left: -6px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
	}

	.suboption-dot--active {
		background: var(--color-primary-600);
		border-color: var(--color-primary-600);
	}

	.option {
		position: relative;
		display: flex;
		gap: 0.35rem;
	}

	.option-label {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		line-height: 1.5;
		min-width: 0;
		overflow: hidden;
	}

	.option-icon {
		height: 1.5rem;
		width: 1.5rem;
		object-fit: contain;
		flex-shrink: 0;
	}

	.option--suboption {
		opacity: 0.85;
	}

	.suboptions-list {
		display: flex;
		flex-direction: column;
		padding: 0.25rem 0 0.5rem 1.5rem;
	}
</style>
