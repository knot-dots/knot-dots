<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';

	export type BadgeDropdownValue = string | number | null | undefined;

	export interface BadgeDropdownOption {
		badgeColor?: string;
		label: string;
		value: BadgeDropdownValue;
	}

	interface Props {
		allowEmpty?: boolean;
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
		allowEmpty = true,
		editable = false,
		emptyLabel,
		label,
		labelledBy,
		offset,
		onchange,
		options,
		value = $bindable()
	}: Props = $props();

	const selected = $derived(options.find((option) => option.value === value));
	const selectedLabel = $derived(selected?.label ?? emptyLabel ?? $_('empty'));
	const effectiveOptions = $derived(
		allowEmpty ? [{ label: emptyLabel ?? $_('empty'), value: undefined }, ...options] : options
	);

	function dropdownButtonClass(option?: BadgeDropdownOption) {
		return option?.badgeColor
			? `dropdown-button dropdown-button--select dropdown-button--${option.badgeColor}`
			: 'dropdown-button dropdown-button--select dropdown-button--empty';
	}

	function badgeClass(option?: BadgeDropdownOption) {
		return option?.badgeColor
			? `badge badge--large badge--${option.badgeColor}`
			: 'badge badge--large badge--empty';
	}
</script>

{#if editable}
	<Dropdown {label} {offset}>
		{#snippet button(popover)}
			<button
				aria-labelledby={labelledBy}
				class={dropdownButtonClass(selected)}
				type="button"
				use:popover.button
			>
				<span class="truncated">{selectedLabel}</span>
			</button>
		{/snippet}

		{#snippet panel(popover)}
			<fieldset aria-labelledby={labelledBy} class="listbox">
				{#each effectiveOptions as option (option.value)}
					<label>
						<input
							type="radio"
							value={option.value}
							bind:group={value}
							onchange={() => {
								popover.close();
								onchange?.(option.value);
							}}
						/>
						<span class={dropdownButtonClass(option)}>{option.label}</span>
					</label>
				{/each}
			</fieldset>
		{/snippet}
	</Dropdown>
{:else}
	<div class="value">
		<span class={badgeClass(selected)}>{selectedLabel}</span>
	</div>
{/if}

<style>
	/* the badge of the design: 28px high, 8px inset, 8px radius, a small
	   chevron tinted in the badge's own hue */
	.dropdown-button {
		--dropdown-button-chevron-icon-size: 0.75rem;
		--dropdown-button-min-height: 1.75rem;
		--dropdown-button-padding: 0 0.5rem;

		border-radius: 8px;
		font-size: 0.875rem;
		gap: 0.25rem;
		max-width: 10rem;
		width: fit-content;
	}

	.badge.badge--empty {
		--badge-background-color: transparent;
		--badge-color: var(--color-text-default);
	}

	.dropdown-button.dropdown-button--empty {
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-text-default);
		--dropdown-button-expanded-background: rgb(from var(--color-primary-500) r g b / 0.15);
	}

	.dropdown-button.dropdown-button--red {
		--dropdown-button-active-background: rgb(from var(--color-red-500) r g b / 0.25);
		--dropdown-button-chevron-default-color: var(--color-red-500);
		--dropdown-button-default-background: var(--color-red-100);
		--dropdown-button-default-color: var(--color-red-700);
		--dropdown-button-expanded-background: rgb(from var(--color-red-500) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-red-500) r g b / 0.1);
	}

	.dropdown-button.dropdown-button--blue {
		--dropdown-button-active-background: rgb(from var(--color-blue-700) r g b / 0.25);
		--dropdown-button-chevron-default-color: var(--color-blue-700);
		--dropdown-button-default-background: var(--color-blue-100);
		--dropdown-button-default-color: var(--color-blue-700);
		--dropdown-button-expanded-background: rgb(from var(--color-blue-700) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-blue-700) r g b / 0.1);
	}

	.dropdown-button.dropdown-button--orange {
		--dropdown-button-active-background: rgb(from var(--color-orange-500) r g b / 0.25);
		--dropdown-button-chevron-default-color: var(--color-orange-500);
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
		--dropdown-button-chevron-default-color: var(--color-indigo-500);
		--dropdown-button-default-background: var(--color-indigo-100);
		--dropdown-button-default-color: var(--color-indigo-700);
		--dropdown-button-expanded-background: rgb(from var(--color-indigo-500) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-indigo-500) r g b / 0.1);
	}

	.dropdown-button.dropdown-button--yellow {
		--dropdown-button-active-background: rgb(from var(--color-yellow-500) r g b / 0.25);
		--dropdown-button-chevron-default-color: var(--color-yellow-500);
		--dropdown-button-default-background: var(--color-yellow-100);
		--dropdown-button-default-color: var(--color-yellow-700);
		--dropdown-button-expanded-background: rgb(from var(--color-yellow-500) r g b / 0.15);
		--dropdown-button-hover-background: rgb(from var(--color-yellow-500) r g b / 0.1);
	}
</style>
