<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import FilterDisclosureOption from '$lib/components/FilterDisclosureOption.svelte';

	type Option = {
		count?: number;
		value: string;
		label: string;
		subOptions?: Option[];
	};

	interface Props {
		key: string;
		label?: string;
		mode: 'select' | 'apply_rule';
		options: Option[];
		value: string[];
	}

	let { key, label, mode, options, value = $bindable() }: Props = $props();

	const labelForKey = new Map([
		['administrativeType', 'administrative_area.basic_data.administrative_type'],
		[
			'cityAndMunicipalityTypeBBSR',
			'administrative_area.basic_data.city_and_municipality_type_bbsr'
		],
		['included', 'included.label'],
		['indicatorType', 'indicator_type'],
		['indicatorCategory', 'indicator_category'],
		['federalState', 'administrative_area.basic_data.federal_state'],
		['member', 'member_filter.label'],
		['programType', 'program_type'],
		['relationType', 'relation_filter.label'],
		['taskCategory', 'task_category.label'],
		['type', 'payload_type']
	]);

	const popover = createPopover({ label });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [
			{
				name: 'offset',
				options: { offset: [0, 4] }
			}
		]
	};

	function hasMatchingSubOptions(option: Option) {
		return (
			option.subOptions?.some((sub) => (sub.count ?? 0) > 0 || value.includes(sub.value)) ?? false
		);
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		{#if value.length > 0 && mode == 'apply_rule'}
			<LightningBolt />
		{/if}
		<span>
			{label ?? $_(labelForKey.get(key) ?? key)}
		</span>
		{#if value.length > 0}
			<span class="indicator">{value.length}</span>
		{/if}
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options.filter((option) => option.count === undefined || option.count > 0 || hasMatchingSubOptions(option)) as option (option.value)}
					<FilterDisclosureOption {option} bind:selected={value} />
				{/each}
				<p>{$_('filter.no_results')}</p>
				{#each options.filter((option) => option.count !== undefined && option.count === 0 && !hasMatchingSubOptions(option)) as option (option.value)}
					<FilterDisclosureOption {option} bind:selected={value} />
				{/each}
			</div>
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-default-background: transparent;
		--dropdown-button-active-background: var(--color-primary-100);
		--dropdown-button-hover-background: var(--color-primary-100);
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdwon-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-panel-max-height: calc(100vh - 12rem);

		position: static;
	}

	.dropdown-panel {
		max-width: min(24rem, calc(100cqw - 3rem));
		z-index: 2;
	}

	.dropdown-panel > div > p:last-child {
		display: none;
	}
</style>
