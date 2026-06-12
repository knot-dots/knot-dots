<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	export type BadgeDropdownValue = string | number | null | undefined;

	export interface BadgeDropdownOption {
		badgeColor?: string;
		label: string;
		value: BadgeDropdownValue;
	}

	interface Props {
		editable?: boolean;
		emptyLabel?: string;
		label?: string;
		labelledBy?: string;
		offset?: [number, number];
		onchange?: (value: BadgeDropdownValue) => void | Promise<void>;
		options: BadgeDropdownOption[];
		value: BadgeDropdownValue;
	}

	let {
		editable = false,
		emptyLabel,
		label,
		labelledBy,
		offset,
		onchange,
		options,
		value = $bindable()
	}: Props = $props();

	const popover = createPopover();

	$effect(() => {
		popover.set({ label });
	});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'fixed'
	});

	const extraOpts = $derived.by(() => ({
		modifiers: [{ name: 'offset', options: { offset } }]
	}));

	const selected = $derived(options.find((option) => option.value === value));
	const selectedLabel = $derived(selected?.label ?? emptyLabel ?? $_('empty'));
	const effectiveOptions = $derived([
		{ label: emptyLabel ?? $_('empty'), value: undefined },
		...options
	]);

	function dropdownButtonClass(option?: BadgeDropdownOption) {
		return option?.badgeColor
			? `dropdown-button dropdown-button--${option.badgeColor}`
			: 'dropdown-button dropdown-button--empty';
	}

	function badgeClass(option?: BadgeDropdownOption) {
		return option?.badgeColor
			? `badge badge--large badge--${option.badgeColor}`
			: 'badge badge--large badge--empty';
	}
</script>

{#if editable}
	<div class="dropdown" use:popperRef>
		<button
			aria-labelledby={labelledBy}
			class={dropdownButtonClass(selected)}
			type="button"
			use:popover.button
		>
			{selectedLabel}
			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $popover.expanded}
			<fieldset
				aria-labelledby={labelledBy}
				class="dropdown-panel"
				use:popperContent={extraOpts}
				use:popover.panel
			>
				{#each effectiveOptions as option (option.value)}
					<label>
						<input
							type="radio"
							value={option.value}
							bind:group={value}
							onchange={() => onchange?.(option.value)}
						/>
						<span class={dropdownButtonClass(option)}>{option.label}</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	<div class="value">
		<span class={badgeClass(selected)}>{selectedLabel}</span>
	</div>
{/if}

<style>
	.dropdown-button {
		border-radius: 6px;
		font-size: 0.875rem;
		gap: 0.25rem;
		padding: 0.25rem 0.75rem;
		width: fit-content;
	}

	.dropdown-button.dropdown-button--empty {
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-gray-500);
		--dropdown-button-expanded-background: rgb(from var(--color-primary-500) r g b / 0.15);
	}

	.dropdown-button.dropdown-button--orange {
		--dropdown-button-active-background: rgb(from var(--color-orange-500) r g b / 0.25);
		--dropdown-button-default-background: var(--color-orange-100);
		--dropdown-button-default-color: var(--color-orange-700);
		--dropdown-button-expanded-background: rgb(from var(--color-orange-500) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-orange-500) r g b / 0.1);
	}

	.dropdown-button.dropdown-button--gray {
		--dropdown-button-default-background: var(--color-gray-100);
		--dropdown-button-default-color: var(--color-gray-700);
		--dropdown-button-expanded-background: rgb(from var(--color-primary-500) r g b / 0.15);
	}

	.dropdown-button.dropdown-button--indigo {
		--dropdown-button-active-background: rgb(from var(--color-indigo-500) r g b / 0.25);
		--dropdown-button-default-background: var(--color-indigo-100);
		--dropdown-button-default-color: var(--color-indigo-700);
		--dropdown-button-expanded-background: rgb(from var(--color-indigo-500) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-indigo-500) r g b / 0.1);
	}

	.dropdown-button.dropdown-button--yellow {
		--dropdown-button-active-background: rgb(from var(--color-yellow-500) r g b / 0.25);
		--dropdown-button-default-background: var(--color-yellow-100);
		--dropdown-button-default-color: var(--color-yellow-700);
		--dropdown-button-expanded-background: rgb(from var(--color-yellow-500) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-yellow-500) r g b / 0.1);
	}
</style>
