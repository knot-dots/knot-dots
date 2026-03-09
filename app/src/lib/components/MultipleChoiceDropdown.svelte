<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import MultipleChoiceDisclosureOption from '$lib/components/MultipleChoiceDisclosureOption.svelte';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		compact?: boolean;
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
		const groupedSubValues = new Set<string>();

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
		<span class="selected" class:truncated={compact}>
			{#each selectedEntries as entry (entry.option.value)}
				{@const iconSrc = iconURL(entry.option.icon)}
				<span class="value" class:value--compact={compact} class:value--child={entry.isChild}>
					{#if iconSrc}
						<img alt="" class="selected-icon" src={iconSrc} />
					{/if}
					<span class="truncated">{entry.option.label}</span>
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

	.value.value--compact:not(:last-child)::after {
		content: ', ';
	}

	.value.value--child {
		padding-left: 1.5rem;
	}

	.selected-icon {
		flex-shrink: 0;
		height: 1.25rem;
		margin-right: 0.35rem;
		object-fit: contain;
		width: 1.25rem;
	}

	.dropdown-panel {
		position: relative;
		overflow: visible;
		min-width: 100%;
		width: 100%;
	}

	.dropdown-panel-scroll {
		overflow-y: auto;
		overflow-x: visible;
	}
</style>
