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
		label?: string;
		labelledBy?: string;
		offset?: [number, number];
		onchange?: (value: BadgeDropdownValue) => void | Promise<void>;
		options: BadgeDropdownOption[];
		value: BadgeDropdownValue;
	}

	let {
		editable = false,
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
	const emptyBadgeStyle = '--badge-background-color: transparent; --badge-color: #44546e;';

	function badgeClass(option?: BadgeDropdownOption) {
		return option?.badgeColor ? `badge badge--${option.badgeColor}` : 'badge';
	}

	function badgeStyle(option?: BadgeDropdownOption) {
		return option ? undefined : emptyBadgeStyle;
	}
</script>

{#if editable}
	<div class="dropdown" use:popperRef>
		<button
			aria-labelledby={labelledBy}
			class={badgeClass(selected)}
			style={badgeStyle(selected)}
			type="button"
			use:popover.button
		>
			{selected?.label ?? $_('empty')}
			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $popover.expanded}
			<fieldset
				aria-labelledby={labelledBy}
				class="dropdown-panel"
				use:popperContent={extraOpts}
				use:popover.panel
			>
				{#each options as option (option.value)}
					<label>
						<input
							type="radio"
							value={option.value}
							bind:group={value}
							onchange={() => onchange?.(option.value)}
						/>
						<span class={badgeClass(option)}>{option.label}</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	<div class="value">
		<span class={badgeClass(selected)} style={badgeStyle(selected)}
			>{selected?.label ?? $_('empty')}</span
		>
	</div>
{/if}

<style>
	.badge {
		float: left;
		font-weight: 500;
	}

	button.badge {
		border: 0;
		cursor: pointer;
	}
</style>
