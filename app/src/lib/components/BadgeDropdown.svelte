<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

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

	// the badge in the option's hue; the empty choice reads as plain text
	const badgeClass = $derived(
		selected?.badgeColor
			? `badge badge--large badge--${selected.badgeColor}`
			: 'badge badge--large badge--empty'
	);
</script>

{#if editable}
	<SingleChoiceDropdown {labelledBy} {offset} {onchange} options={effectiveOptions} bind:value>
		{#snippet button(popover)}
			<button aria-labelledby={labelledBy} class="dropdown-button" type="button" use:popover.button>
				<span class={badgeClass}><span class="truncated">{selectedLabel}</span></span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span class={badgeClass}><span class="truncated">{selectedLabel}</span></span>
{/if}

<style>
	/* the button is invisible; the badge is the control, with the chevron the
	   global dropdown rules add to a badge inside a dropdown button */
	.dropdown-button {
		--dropdown-button-active-background: transparent;
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: transparent;
		--dropdown-button-hover-background: transparent;
		--dropdown-button-padding: 0;

		width: fit-content;
	}

	/* the chevron takes the hue of the badge */
	.badge {
		--dropdown-button-chevron-default-color: currentColor;
	}

	.badge.badge--empty {
		--badge-background-color: transparent;
		--badge-color: var(--color-text-default);
	}
</style>
