<script lang="ts">
	import { _ } from 'svelte-i18n';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import Dropdown from '$lib/components/Dropdown.svelte';
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
		['organization', 'organization'],
		['organizationalUnit', 'organizational_unit'],
		['programType', 'program_type'],
		['relationType', 'relation_filter.label'],
		['taskCategory', 'task_category.label'],
		['type', 'payload_type']
	]);

	function hasMatchingSubOptions(option: Option) {
		return (
			option.subOptions?.some((sub) => (sub.count ?? 0) > 0 || value.includes(sub.value)) ?? false
		);
	}
</script>

<Dropdown
	--dropdown-position="static"
	--dropdown-button-border-radius="8px"
	--dropdown-button-active-background="var(--color-primary-100)"
	--dropdown-button-default-background="transparent"
	--dropdown-button-expanded-background="(--color-primary-100)"
	--dropdown-button-expanded-color="var(--color-primary-700)"
	--dropdown-button-hover-backgroun="var(--color-primary-100)"
	--dropdown-panel-max-height="calc(100vh - 12rem)"
	--dropdown-panel-max-width="min(24rem, calc(100cqw - 3rem))"
	{label}
	offset={[0, 4]}
>
	{#snippet button(popover)}
		<button class="dropdown-button dropdown-button--select" type="button" use:popover.button>
			{#if value.length > 0 && mode == 'apply_rule'}
				<LightningBolt />
			{/if}
			<span>
				{label ?? $_(labelForKey.get(key) ?? key)}
			</span>
			{#if value.length > 0}
				<span class="indicator">{value.length}</span>
			{/if}
		</button>
	{/snippet}

	{#snippet panel()}
		<fieldset class="listbox">
			{#each options.filter((option) => option.count === undefined || option.count > 0 || hasMatchingSubOptions(option)) as option (option.value)}
				<FilterDisclosureOption {option} bind:selected={value} />
			{/each}
			<p>{$_('filter.no_results')}</p>
			{#each options.filter((option) => option.count !== undefined && option.count === 0 && !hasMatchingSubOptions(option)) as option (option.value)}
				<FilterDisclosureOption {option} bind:selected={value} />
			{/each}
		</fieldset>
	{/snippet}
</Dropdown>

<style>
	.listbox > p:last-child {
		display: none;
	}
</style>
