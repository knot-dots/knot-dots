<script lang="ts">
	import { getContext } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ChevronRight from '~icons/heroicons/chevron-right-16-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { paramsFromFragment } from '$lib/models';
	import transformFileURL from '$lib/transformFileURL';

	type OptionWithSub = {
		count?: number;
		value: string;
		label: string;
		guid?: string;
		icon?: string;
		subterms?: OptionWithSub[];
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
		['measureType', 'measure_type'],
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
	let panelEl = $state<HTMLElement | null>(null);
	let hoveredSubterms = $state<OptionWithSub['subterms']>();
	let flyoutPlacement = $state<'left' | 'right'>('right');
	let flyoutTop = $state(0);
	let hideFlyoutTimeout: number | undefined;

	function showSubtermsAt(anchor: HTMLElement, option: OptionWithSub) {
		if (!option.subterms?.length) {
			hoveredSubterms = undefined;
			return;
		}

		hoveredSubterms = option.subterms;

		const optionRect = anchor.getBoundingClientRect();
		const panelRect = panelEl?.getBoundingClientRect();
		if (panelRect) {
			flyoutTop = optionRect.top - panelRect.top;
			const spaceRight = window.innerWidth - panelRect.right;
			flyoutPlacement = spaceRight < 260 ? 'left' : 'right';
		}
	}

	function handleOptionEnter(event: MouseEvent, option: OptionWithSub) {
		window.clearTimeout(hideFlyoutTimeout);
		showSubtermsAt(event.currentTarget as HTMLElement, option);
	}

	function handleOptionLeave() {
		hideFlyoutTimeout = window.setTimeout(() => {
			hoveredSubterms = undefined;
		}, 120);
	}

	function handleFlyoutEnter() {
		window.clearTimeout(hideFlyoutTimeout);
	}

	function handleChevronClick(event: MouseEvent, option: OptionWithSub) {
		event.preventDefault();
		event.stopPropagation();
		window.clearTimeout(hideFlyoutTimeout);
		const anchor = (event.currentTarget as HTMLElement).closest('.option') as HTMLElement | null;
		if (!anchor) return;
		showSubtermsAt(anchor, option);
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
		<fieldset
			class="dropdown-panel"
			use:popperContent={extraOpts}
			use:popover.panel
			bind:this={panelEl}
		>
			<div class="options">
				{#each options.filter(({ count }) => count === undefined || count > 0) as option (option.value)}
					<div
						class="option"
						role="presentation"
						onmouseenter={(event) => handleOptionEnter(event, option)}
						onmouseleave={handleOptionLeave}
					>
						<label>
							<input onchange={apply} type="checkbox" value={option.value} bind:group={selected} />
							<span class="badge badge--gray">
								{#if option.icon}
									<img
										src={transformFileURL(option.icon)}
										alt=""
										class="filter-option-icon"
									/>
								{/if}
								{option.label}
								{#if option.count !== undefined}
									<span class="counter">({option.count})</span>
								{/if}
								{#if option.subterms?.length}
									<button
										type="button"
										class="subterm-button"
										onclick={(event) => handleChevronClick(event, option)}
										onkeydown={(event) =>
											event.key === 'Enter' || event.key === ' '
												? (event.preventDefault(),
													handleChevronClick(event as unknown as MouseEvent, option))
												: undefined}
										aria-label={$_('filter.show_subterms')}
									>
										<ChevronRight class="subterm-indicator" aria-hidden="true" />
									</button>
								{/if}
							</span>
						</label>
					</div>
				{/each}
				<p>{$_('filter.no_results')}</p>
				{#each options.filter(({ count }) => count !== undefined && count === 0) as option (option.value)}
					<div
						class="option"
						role="presentation"
						onmouseenter={(event) => handleOptionEnter(event, option)}
						onmouseleave={handleOptionLeave}
					>
						<label>
							<input onchange={apply} type="checkbox" value={option.value} bind:group={selected} />
							<span class="badge badge--gray">
								{#if option.icon}
									<img
										src={transformFileURL(option.icon)}
										alt=""
										class="filter-option-icon"
									/>
								{/if}
								{option.label}
								<span class="counter">({option.count})</span>
								{#if option.subterms?.length}
									<button
										type="button"
										class="subterm-button"
										onclick={(event) => handleChevronClick(event, option)}
										onkeydown={(event) =>
											event.key === 'Enter' || event.key === ' '
												? (event.preventDefault(),
													handleChevronClick(event as unknown as MouseEvent, option))
												: undefined}
										aria-label={$_('filter.show_subterms')}
									>
										<ChevronRight class="subterm-indicator" aria-hidden="true" />
									</button>
								{/if}
							</span>
						</label>
					</div>
				{/each}
			</div>

			{#if hoveredSubterms?.length}
				<div
					class="subterms-flyout"
					class:subterms-flyout--left={flyoutPlacement === 'left'}
					style={`top:${flyoutTop}px;`}
					role="presentation"
					onmouseenter={handleFlyoutEnter}
					onmouseleave={handleOptionLeave}
				>
					{#each hoveredSubterms as sub (sub.value)}
						<label class="option option--subterm">
							<input onchange={apply} type="checkbox" value={sub.value} bind:group={selected} />
							<span class="badge badge--gray">
								{#if sub.icon}
									<img
										src={transformFileURL(sub.icon)}
										alt=""
										class="filter-option-icon"
									/>
								{/if}
								{sub.label}
								{#if sub.count !== undefined}
									<span class="counter">({sub.count})</span>
								{/if}
							</span>
						</label>
					{/each}
				</div>
			{/if}
		</fieldset>
	{/if}
</div>

<style>
	.counter {
		color: var(--color-gray-500);
	}

	.filter-option-icon {
		height: 1rem;
		width: 1rem;
		object-fit: contain;
		margin-right: 0.35rem;
		vertical-align: middle;
	}

	:global(.subterm-indicator) {
		height: 1rem;
		width: 1rem;
		color: var(--color-gray-500);
	}

	.subterm-button {
		background: none;
		border: none;
		padding: 0;
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		color: var(--color-gray-500);
		cursor: pointer;
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

	.dropdown-panel {
		z-index: 2;
		position: relative;
		overflow: visible;
	}

	.options {
		max-height: var(--dropdown-panel-max-height);
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.option {
		position: relative;
	}

	.option--subterm {
		opacity: 0.85;
	}

	.subterms-flyout {
		position: absolute;
		top: 0;
		left: calc(100% - 0.25rem);
		min-width: 220px;
		max-width: 260px;
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		z-index: 3;
	}

	.subterms-flyout--left {
		left: auto;
		right: calc(100% - 0.25rem);
	}

	.dropdown-panel > div > p:last-child {
		display: none;
	}
</style>
