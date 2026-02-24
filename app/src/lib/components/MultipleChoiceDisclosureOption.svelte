<script lang="ts">
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	interface Option {
		label: string;
		value: string;
		icon?: string;
		count?: number;
		subOptions?: Array<{ label: string; value: string; icon?: string; count?: number }>;
	}

	interface Props {
		option: Option;
		optionIndex: number;
		value: string[];
		iconURL: (origin?: string) => string | undefined;
	}

	let { option, optionIndex, value = $bindable([] as string[]), iconURL }: Props = $props();

	const disclosure = createDisclosure({});

	function toggleSelection(entryValue: string, checked: boolean) {
		const current = Array.isArray(value) ? value : [];
		if (checked) {
			value = current.includes(entryValue) ? current : [...current, entryValue];
			return;
		}
		value = current.filter((item) => item !== entryValue);
	}

	const selectedSubCount = $derived.by(
		() => option.subOptions?.filter((sub) => value.includes(sub.value)).length ?? 0
	);
	const hasSelectedSubOptions = $derived.by(() => selectedSubCount > 0);
	const iconSrc = $derived.by(() => iconURL(option.icon));
</script>

<div class="option" role="presentation">
	<label>
		<input
			data-option-index={optionIndex}
			data-role="option-checkbox"
			aria-label={hasSelectedSubOptions
				? `${option.label}, ${selectedSubCount} Unterziele ausgewählt`
				: option.label}
			type="checkbox"
			value={option.value}
			checked={value.includes(option.value)}
			onchange={(event) =>
				toggleSelection(option.value, (event.currentTarget as HTMLInputElement).checked)}
		/>
		<span class="option-label">
			{#if iconSrc}
				<img alt="" class="option-icon" src={iconSrc} />
			{/if}
			{option.label}
			{#if option.count !== undefined}
				<span class="option-count">({option.count})</span>
			{/if}
		</span>
	</label>
	{#if option.subOptions?.length}
		<button
			type="button"
			class="suboption-button"
			data-option-index={optionIndex}
			data-role="option-toggle"
			use:disclosure.button
			aria-label={$_('filter.show_suboptions')}
		>
			<span
				class="suboption-dot"
				class:suboption-dot--active={hasSelectedSubOptions}
				aria-hidden="true"
			></span>
			{#if $disclosure.expanded}
				<ChevronUp class="suboption-indicator" aria-hidden="true" />
			{:else}
				<ChevronDown class="suboption-indicator" aria-hidden="true" />
			{/if}
		</button>
	{/if}
</div>
{#if option.subOptions?.length && $disclosure.expanded}
	<div class="suboptions-list" role="presentation" use:disclosure.panel>
		{#each option.subOptions as sub, subIndex (sub.value)}
			{@const subIcon = iconURL(sub.icon)}
			<label class="option option--suboption">
				<input
					data-option-index={optionIndex}
					data-sub-index={subIndex}
					data-role="suboption-checkbox"
					type="checkbox"
					value={sub.value}
					checked={value.includes(sub.value)}
					onchange={(event) =>
						toggleSelection(sub.value, (event.currentTarget as HTMLInputElement).checked)}
				/>
				<span class="option-label">
					{#if subIcon}
						<img alt="" class="option-icon" src={subIcon} />
					{/if}
					{sub.label}
					{#if sub.count !== undefined}
						<span class="option-count">({sub.count})</span>
					{/if}
				</span>
			</label>
		{/each}
	</div>
{/if}

<style>
	.option-label {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
	}

	.option {
		align-items: center;
		display: flex;
		gap: 0.35rem;
		justify-content: space-between;
	}

	.option > label {
		width: 100%;
	}

	.option-count {
		color: var(--color-gray-600);
		font-size: 0.875rem;
	}

	:global(.suboption-indicator) {
		color: var(--color-gray-700);
		height: 1rem;
		width: 1rem;
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

	.suboption-button {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		padding: 0.25rem;
	}

	.suboption-button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.suboptions-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.25rem 0 0.5rem 1.5rem;
	}

	.option--suboption {
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.option-icon {
		height: 1.25rem;
		width: 1.25rem;
		object-fit: contain;
	}
</style>
