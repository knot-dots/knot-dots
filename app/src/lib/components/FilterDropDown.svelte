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

	interface Props {
		initialValue?: string[];
		key: string;
		label?: string;
		options: Array<{ count?: number; value: string; label: string }>;
	}

	let { initialValue = [], key, label, options }: Props = $props();

	let overlay = getContext('overlay');

	const changeKey = `${key}Changed`;

	const labelForKey = new Map([
		['included', 'included.label'],
		['indicatorType', 'indicator_type'],
		['indicatorCategory', 'indicator_category'],
		['measureType', 'measure_type'],
		['type', 'payload_type'],
		['policyFieldBNK', 'policy_field_bnk'],
		['programType', 'program_type.label'],
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
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span>{$_(labelForKey.get(key) ?? key)}</span>
		{#if selected.length > 0}
			<span class="indicator">{selected.length}</span>
		{/if}
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options.filter(({ count }) => count === undefined || count > 0) as option (option.value)}
					<label>
						<input onchange={apply} type="checkbox" value={option.value} bind:group={selected} />
						<span class="badge badge--gray">
							{option.label}
							{#if option.count !== undefined}
								<span class="counter">({option.count})</span>
							{/if}
						</span>
					</label>
				{/each}
				<p>{$_('filter.no_results')}</p>
				{#each options.filter(({ count }) => count !== undefined && count === 0) as option (option.value)}
					<label>
						<input onchange={apply} type="checkbox" value={option.value} bind:group={selected} />
						<span class="badge badge--gray">
							{option.label}
							<span class="counter">({option.count})</span>
						</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>

<style>
	.counter {
		color: var(--color-gray-500);
	}

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

	.dropdown-panel > div > p:last-child {
		display: none;
	}
</style>
