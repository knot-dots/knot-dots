<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { SvelteSet } from 'svelte/reactivity';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import MultipleChoiceDisclosureOption from '$lib/components/MultipleChoiceDisclosureOption.svelte';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		compact?: boolean;
		iconOnly?: boolean;
		showSelectedIcons?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{
			label: string;
			value: string;
			icon?: string;
			subOptions?: Array<{ label: string; value: string; icon?: string }>;
		}>;
		value: string[];
	}

	let {
		compact = false,
		iconOnly = false,
		showSelectedIcons = true,
		labelledBy,
		offset = [0, 4],
		options,
		value = $bindable([] as string[])
	}: Props = $props();

	const popover = createPopover({});

	const [popperRef, popperContent, getPopperInstance] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	function autoUpdate(node: HTMLElement) {
		const update = () => getPopperInstance()?.update();
		const observer = new ResizeObserver(update);
		observer.observe(node);
		if (node.parentElement) observer.observe(node.parentElement);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);

		return {
			destroy() {
				observer.disconnect();
				window.removeEventListener('resize', update);
				window.removeEventListener('scroll', update, true);
			}
		};
	}

	const extraOpts = $derived.by(() => ({
		modifiers: [{ name: 'offset', options: { offset } }]
	}));

	$effect(() => {
		if (!$popover.expanded) return;
		queueMicrotask(() => getPopperInstance()?.update());
	});

	let panelEl = $state<HTMLElement | null>(null);

	type Option = (typeof options)[number];
	type SubOption = NonNullable<Option['subOptions']>[number];

	const selectedEntries = $derived.by(() => {
		if (!Array.isArray(value)) return [];
		const entries: Array<{
			option: Option | SubOption;
			isChild: boolean;
		}> = [];
		const groupedSubValues = new SvelteSet<string>();

		for (const option of options) {
			if (!value.includes(option.value)) continue;
			entries.push({ option, isChild: false });
			for (const sub of option.subOptions ?? []) {
				if (!value.includes(sub.value)) continue;
				entries.push({ option: sub, isChild: true });
				groupedSubValues.add(sub.value);
			}
		}

		for (const option of options) {
			for (const sub of option.subOptions ?? []) {
				if (!value.includes(sub.value) || groupedSubValues.has(sub.value)) continue;
				entries.push({ option: sub, isChild: true });
			}
		}

		return entries;
	});

	function iconURL(origin?: string) {
		if (!origin) return undefined;
		try {
			return transformFileURL(origin);
		} catch (error) {
			console.warn('Failed to transform icon URL', error);
			return origin;
		}
	}
</script>

<div class="dropdown" use:popperRef use:autoUpdate>
	<button aria-labelledby={labelledBy} class="dropdown-button" type="button" use:popover.button>
		<span
			class="selected"
			class:truncated={compact || iconOnly}
			class:selected--icon-only={iconOnly && showSelectedIcons}
		>
			{#each selectedEntries as entry (entry.option.value)}
				{@const iconSrc = iconURL(entry.option.icon)}
				<span
					class="value"
					class:value--compact={compact}
					class:value--icon-only={iconOnly && showSelectedIcons}
					class:value--child={entry.isChild}
				>
					{#if showSelectedIcons && iconSrc}
						<img
							alt={entry.option.label}
							class="selected-icon"
							class:selected-icon--large={iconOnly && showSelectedIcons}
							src={iconSrc}
						/>
					{/if}
					{#if !(iconOnly && showSelectedIcons && iconSrc)}
						<span class="truncated">{entry.option.label}</span>
					{/if}
				</span>
			{/each}
			{#if selectedEntries.length === 0}
				{$_('empty')}
			{/if}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset
			aria-labelledby={labelledBy}
			class="dropdown-panel"
			use:popperContent={extraOpts}
			use:popover.panel
			bind:this={panelEl}
		>
			<div
				class="dropdown-panel-scroll"
				role="listbox"
				aria-multiselectable="true"
				aria-labelledby={labelledBy}
				tabindex="0"
			>
				{#each options as option, optionIndex (option.value)}
					<MultipleChoiceDisclosureOption {option} {optionIndex} bind:value {iconURL} />
				{/each}
			</div>
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-align-items: start;
	}

	.selected {
		display: block;
		min-width: 0;
		overflow: hidden;
	}

	.selected.selected--icon-only {
		align-items: center;
	}

	.value {
		align-items: center;
		display: flex;
		gap: 0.35rem;
		min-width: 0;
		padding: 0;
		text-align: left;
	}

	.value + .value {
		margin-top: 0.35rem;
	}

	.value.value--compact {
		display: inline;
	}

	.value.value--compact:not(:last-child):not(.value--icon-only)::after {
		content: ', ';
	}

	.value.value--icon-only {
		display: inline;
	}

	.value.value--icon-only:not(:last-child):not(:has(.selected-icon))::after {
		content: ', ';
	}

	.value.value--icon-only:has(.selected-icon) {
		display: inline-flex;
		flex-shrink: 0;
		margin-right: 0.25rem;
		vertical-align: middle;
	}

	.value.value--icon-only + .value.value--icon-only {
		margin-top: 0;
	}

	.value.value--icon-only .selected-icon {
		margin-right: 0;
	}

	.value.value--child {
		padding-left: 1.5rem;
	}

	.value.value--icon-only.value--child {
		padding-left: 0;
	}

	.selected-icon {
		flex-shrink: 0;
		height: 1.25rem;
		margin-right: 0.35rem;
		object-fit: contain;
		width: 1.25rem;
	}

	.selected-icon.selected-icon--large {
		height: 1.5rem;
		object-fit: fill;
		width: 1.5rem;
	}

	.dropdown-panel {
		position: relative;
		overflow: visible;
		min-width: 100%;
	}

	.dropdown-panel-scroll {
		overflow-y: auto;
		overflow-x: visible;
	}
</style>
