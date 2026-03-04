<script lang="ts">
	import { getContext } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { paramsFromFragment } from '$lib/models';
	import FilterDisclosureOption from '$lib/components/FilterDisclosureOption.svelte';

	type OptionWithSub = {
		count?: number;
		value: string;
		label: string;
		guid?: string;
		icon?: string;
		subOptions?: OptionWithSub[];
	};

	interface Props {
		initialValue?: string[];
		key: string;
		label?: string;
		options: OptionWithSub[];
	}

	let { initialValue = [], key, label, options }: Props = $props();

	let overlay = getContext('overlay');

	const changeKey = $derived.by(() => `${key}Changed`);

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
		['sdg', 'indicator_category.sdg'],
		['member', 'member_filter.label'],
		['type', 'payload_type'],
		['policyFieldBNK', 'policy_field_bnk'],
		['programType', 'program_type'],
		['relationType', 'relation_filter.label'],
		['taskCategory', 'task_category.label']
	]);

	let selected = $derived.by(() => {
		if (overlay) {
			return initialValue.length == 0 || paramsFromFragment(page.url).has(changeKey)
				? paramsFromFragment(page.url).getAll(key)
				: initialValue;
		} else {
			return initialValue.length == 0 || page.url.searchParams.has(changeKey)
				? page.url.searchParams.getAll(key)
				: initialValue;
		}
	});

	const popover = $derived.by(() => createPopover({ label }));

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

	function apply() {
		if (overlay) {
			const query = new URLSearchParams(page.url.hash.substring(1));
			query.delete(key);
			if (initialValue.length > 0) {
				query.set(changeKey, '');
			}
			selected.forEach((s) => query.append(key, s));
			goto(`#${query.toString()}`, { keepFocus: true });
		} else {
			const query = new URLSearchParams(page.url.searchParams);
			query.delete(key);
			if (initialValue.length > 0) {
				query.set(changeKey, '');
			}
			selected.forEach((s) => query.append(key, s));
			goto(`?${query.toString()}${page.url.hash}`, { keepFocus: true });
		}
	}

	function hasMatchingSubOptions(option: OptionWithSub) {
		return (
			option.subOptions?.some((sub) => (sub.count ?? 0) > 0 || selected.includes(sub.value)) ??
			false
		);
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span>{label ?? $_(labelForKey.get(key) ?? key)}</span>
		{#if selected.length > 0}
			<span class="indicator">{selected.length}</span>
		{/if}
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div class="options">
				{#each options.filter((option) => option.count === undefined || option.count > 0 || hasMatchingSubOptions(option)) as option (option.value)}
					<FilterDisclosureOption {option} bind:selected {apply} />
				{/each}
				<p>{$_('filter.no_results')}</p>
				{#each options.filter((option) => option.count !== undefined && option.count === 0 && !hasMatchingSubOptions(option)) as option (option.value)}
					<FilterDisclosureOption {option} bind:selected {apply} />
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
		--dropdown-panel-max-height: calc(100vh - 8rem);

		position: static;
	}

	.dropdown-panel {
		z-index: 2;
		position: relative;
		overflow: visible;
		min-width: 16rem;
		max-width: 24rem;
	}

	.options {
		max-height: var(--dropdown-panel-max-height);
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.dropdown-panel > div > p:last-child {
		display: none;
	}
</style>
