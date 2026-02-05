<script lang="ts">
	import { tick } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

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

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	let extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset } }]
	});

	async function handleInvalid() {
		if (!$popover.expanded) {
			popover.open();
			await tick();
			buttonEl?.focus();
		}
	}
</script>

<div class="dropdown" class:dropdown--invalid={missingRequired} use:popperRef>
	{#if required && !value}
		<input
			class="validation-input"
			name={radioName}
			oninvalid={handleInvalid}
			required
			tabindex={-1}
			type="radio"
			value=""
		/>
	{/if}
	<button
		bind:this={buttonEl}
		aria-labelledby={labelledBy}
		class="dropdown-button"
		type="button"
		use:popover.button
	>
		<span class="truncated" class:dropdown-placeholder={!selected}>
			{#if selected}{selected.label}{:else}{$_('empty')}{/if}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $popover.expanded}
		<fieldset
			aria-labelledby={labelledBy}
			class="dropdown-panel"
			use:popperContent={extraOpts}
			use:popover.panel
		>
			<div>
				{#each groups as group (group.title)}
					{#if group.options.length > 0}
						<p class="group-title">{group.title}</p>
						{#each group.options as option (option.value)}
							<label class:label--disabled={option.disabled}>
								<input
									oninvalid={handleInvalid}
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
			</div>
		</fieldset>
	{/if}
</div>

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
	.dropdown--invalid {
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
