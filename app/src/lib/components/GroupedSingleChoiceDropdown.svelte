<script lang="ts">
	import { tick } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';

	export type GroupedSingleChoiceOption = {
		label: string;
		value: string;
		disabled?: boolean;
	};

	export type GroupedSingleChoiceGroup = {
		title: string;
		options: GroupedSingleChoiceOption[];
	};

	interface Props {
		labelledBy?: string;
		name?: string;
		offset?: [number, number];
		groups: GroupedSingleChoiceGroup[];
		required?: boolean;
		value: string | null | undefined;
	}

	let {
		labelledBy,
		name,
		offset = [0, 4],
		groups,
		required = false,
		value = $bindable()
	}: Props = $props();

	let flatOptions = $derived(groups.flatMap((g) => g.options));
	let selected = $derived(flatOptions.find((o) => o.value == value));
	let missingRequired = $derived(required && (value == null || value === ''));
	let radioName = $derived(name ?? labelledBy ?? 'grouped-single-choice');
	let buttonEl: HTMLButtonElement | null = null;

	async function handleInvalid(popover: ReturnType<typeof createPopover>) {
		popover.open();
		await tick();
		buttonEl?.focus();
	}
</script>

<Dropdown {offset}>
	{#snippet button(popover)}
		{#if required && !value}
			<input
				class="validation-input"
				name={radioName}
				oninvalid={() => handleInvalid(popover)}
				required
				tabindex={-1}
				type="radio"
				value=""
			/>
		{/if}
		<button
			bind:this={buttonEl}
			aria-labelledby={labelledBy}
			class={[
				'dropdown-button',
				'dropdown-button--select',
				...(missingRequired ? ['dropdown-button--invalid'] : [])
			]}
			type="button"
			use:popover.button
		>
			<span class="truncated" class:dropdown-placeholder={!selected}>
				{#if selected}{selected.label}{:else}{$_('empty')}{/if}
			</span>
		</button>
	{/snippet}

	{#snippet panel(popover)}
		<fieldset aria-labelledby={labelledBy} class="listbox">
			{#each groups as group (group.title)}
				{#if group.options.length > 0}
					<p class="group-title">{group.title}</p>
					{#each group.options as option (option.value)}
						<label class:label--disabled={option.disabled}>
							<input
								oninvalid={() => handleInvalid(popover)}
								disabled={option.disabled}
								name={radioName}
								{required}
								type="radio"
								value={option.value}
								bind:group={value}
							/>
							<span class="truncated">{option.label}</span>
						</label>
					{/each}
				{/if}
			{/each}
		</fieldset>
	{/snippet}
</Dropdown>

<style>
	/* Hidden input for form validation when dropdown is closed */
	.validation-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	/* Validation state */
	.dropdown-button.dropdown-button--invalid {
		--dropdown-button-default-background: var(--color-red-050);
		--dropdown-button-default-border-color: var(--color-red-500);
		--dropdown-button-default-color: var(--color-red-700);
		--dropdown-button-hover-background: var(--color-red-100);
		--dropdown-button-active-background: var(--color-red-100);
		--dropdown-button-chevron-default-color: var(--color-red-700);
	}

	.dropdown-placeholder {
		color: var(--color-gray-400);
	}

	/* Group title styling */
	.group-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		margin: 0;
		padding: 0.5rem 0.75rem 0.25rem;
	}

	/* Disabled label styling */
	.label--disabled {
		opacity: 0.6;
		pointer-events: none;
	}
</style>
