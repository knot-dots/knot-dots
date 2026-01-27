<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ColumnSolid from '~icons/flowbite/column-solid';
	import GraduationCap from '~icons/flowbite/graduation-cap-outline';
	import Grid from '~icons/flowbite/grid-solid';
	import TableRow from '~icons/flowbite/table-row-solid';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Compass from '~icons/knotdots/compass';
	import Gavel from '~icons/knotdots/gavel';
	import Goal from '~icons/knotdots/goal';
	import LandingPage from '~icons/knotdots/landing-page';
	import Level from '~icons/knotdots/level';
	import Objects from '~icons/knotdots/objects';
	import Program from '~icons/knotdots/program';
	import Star from '~icons/knotdots/star';
	import Resources from '~icons/knotdots/resources_v2';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import { boards } from '$lib/models';

	const workspacesLeft: Record<string, Record<string, string>> = {
		all: {
			catalog: '/all/catalog',
			level: '/all/level',
			page: '/all/page',
			status: '/all/level',
			table: '/all/table'
		},
		goals: {
			catalog: '/goals/catalog',
			level: '/goals/level',
			status: '/goals/status',
			table: '/goals/table'
		},
		indicators: {
			catalog: '/indicators/catalog',
			table: '/indicators/table'
		},
		knowledge: {
			catalog: '/knowledge/catalog',
			level: '/knowledge/level',
			table: '/knowledge/table'
		},
		measures: {
			catalog: '/measures/catalog',
			monitoring: '/measures/monitoring',
			status: '/measures/status',
			table: '/measures/table'
		},
		'objectives-and-effects': {
			level: '/objectives-and-effects'
		},
		programs: {
			catalog: '/programs/catalog',
			level: '/programs/level',
			status: '/programs/status',
			table: '/programs/table'
		},
		rules: {
			catalog: '/rules/catalog',
			status: '/rules/status',
			table: '/rules/table'
		},
		tasks: {
			catalog: '/tasks/catalog',
			status: '/tasks/status',
			table: '/tasks/table'
		},
		...(createFeatureDecisions(page.data.features).useResourceWorkspace()
			? {
					resources: {
						catalog: '/resources/catalog',
						table: '/resources/table'
					}
				}
			: undefined)
	};

	const workspacesRight: Record<string, Record<string, string>> = {
		catalog: {
			all: '/all/catalog',
			goals: '/goals/catalog',
			indicators: '/indicators/catalog',
			knowledge: '/knowledge/catalog',
			measures: '/measures/catalog',
			programs: '/programs/catalog',
			rules: '/rules/catalog',
			tasks: '/tasks/catalog',
			...(createFeatureDecisions(page.data.features).useResourceWorkspace()
				? { resources: '/resources/catalog' }
				: undefined)
		},
		level: {
			all: '/all/level',
			knowledge: '/knowledge/level',
			goals: '/goals/level',
			'objectives-and-effects': '/objectives-and-effects',
			programs: '/programs/level'
		},
		monitoring: { measures: '/measures/monitoring' },
		status: {
			goals: '/goals/status',
			measures: '/measures/status',
			programs: '/programs/status',
			rules: '/rules/status',
			tasks: '/tasks/status'
		},
		page: {
			all: '/all/page'
		},
		table: {
			all: '/all/table',
			goals: '/goals/table',
			indicators: '/indicators/table',
			knowledge: '/knowledge/table',
			measures: '/measures/table',
			programs: '/programs/table',
			rules: '/rules/table',
			tasks: '/tasks/table',
			...(createFeatureDecisions(page.data.features).useResourceWorkspace()
				? { resources: '/resources/table' }
				: undefined)
		}
	};

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let pathnamePrefix = $derived(`/${selectedContext.guid}`);

	let pathnameWithoutContextSegment = $derived.by(() => {
		const pathnameSegments = page.url.pathname.split('/');

		if (pathnameSegments.length > 1 && pathnameSegments[1] == selectedContext.guid) {
			return [pathnameSegments.slice(0, 1), ...pathnameSegments.slice(2)].join('/');
		} else {
			return page.url.pathname;
		}
	});

	let selectedItem = $derived(
		pathnameWithoutContextSegment === '/'
			? ['all', 'page']
			: pathnameWithoutContextSegment.split('/').slice(1, 3)
	);

	interface Option {
		exists: boolean;
		icon: Component<SvelteHTMLElements['svg']>;
		label: string;
		recommended: boolean;
		value: string;
	}

	let leftOptions: Option[] = $derived([
		{
			exists: true,
			icon: Objects,
			label: $_('workspace.type.all'),
			recommended: false,
			value: workspacesLeft.all[selectedItem[1]] ?? '/all/level'
		},
		{
			exists: true,
			icon: Program,
			label: $_('workspace.type.programs'),
			recommended: false,
			value: workspacesLeft.programs[selectedItem[1]] ?? '/programs/catalog'
		},
		{
			exists: true,
			icon: Goal,
			label: $_('workspace.type.goals'),
			recommended: false,
			value: workspacesLeft.goals[selectedItem[1]] ?? '/goals/level'
		},
		{
			exists: true,
			icon: Gavel,
			label: $_('workspace.type.rules'),
			recommended: false,
			value: workspacesLeft.rules[selectedItem[1]] ?? '/rules/status'
		},
		{
			exists: true,
			icon: Clipboard,
			label: $_('workspace.type.measures'),
			recommended: false,
			value: workspacesLeft.measures[selectedItem[1]] ?? '/measures/status'
		},
		{
			exists: true,
			icon: GraduationCap,
			label: $_('workspace.type.knowledge'),
			recommended: false,
			value: workspacesLeft.knowledge[selectedItem[1]] ?? '/knowledge/level'
		},
		...(createFeatureDecisions(page.data.features).useResourceWorkspace()
			? [
					{
						exists: true,
						icon: Resources,
						label: $_('workspace.type.resources'),
						recommended: false,
						value: workspacesLeft.resources[selectedItem[1]] ?? '/resources/catalog'
					}
				]
			: []),
		...(!('default' in selectedContext.payload) || !selectedContext.payload.default
			? [
					{
						exists: true,
						icon: ClipboardCheck,
						label: $_('workspace.type.tasks'),
						recommended: false,
						value: workspacesLeft.tasks[selectedItem[1]] ?? '/tasks/status'
					}
				]
			: []),
		...(selectedContext.payload.boards.includes(boards.enum['board.indicators'])
			? [
					{
						exists: true,
						icon: ChartBar,
						label: $_('workspace.type.indicators'),
						recommended: false,
						value: workspacesLeft.indicators[selectedItem[1]] ?? '/indicators/catalog'
					},
					{
						exists: true,
						icon: ChartMixed,
						label: $_('workspace.type.objectives_and_effects'),
						recommended: false,
						value:
							workspacesLeft['objectives-and-effects'][selectedItem[1]] ?? '/objectives-and-effects'
					}
				]
			: [])
	]);

	let rightOptions: Option[] = $derived([
		{
			exists: selectedItem[0] in workspacesRight.page,
			icon: LandingPage,
			label: $_('workspace.view.page'),
			recommended: false,
			value: workspacesRight.page[selectedItem[0]] ?? '/all/page'
		},
		{
			exists: selectedItem[0] in workspacesRight.status,
			icon: ColumnSolid,
			label: $_('workspace.view.status'),
			recommended: ['measures', 'rules', 'tasks'].includes(selectedItem[0]),
			value: workspacesRight.status[selectedItem[0]] ?? '/measures/status'
		},
		{
			exists: selectedItem[0] in workspacesRight.level,
			icon: Level,
			label: $_('workspace.view.level'),
			recommended: ['all', 'goals', 'knowledge', 'objectives-and-effects'].includes(
				selectedItem[0]
			),
			value: workspacesRight.level[selectedItem[0]] ?? '/all/level'
		},
		{
			exists: selectedItem[0] in workspacesRight.monitoring,
			icon: Compass,
			label: $_('workspace.view.monitoring'),
			recommended: selectedItem[0] == 'measures',
			value: workspacesRight.monitoring[selectedItem[0]] ?? '/measures/monitoring'
		},
		{
			exists: selectedItem[0] in workspacesRight.catalog,
			icon: Grid,
			label: $_('workspace.view.catalog'),
			recommended: selectedItem[0] == 'indicators',
			value: workspacesRight.catalog[selectedItem[0]] ?? '/all/catalog'
		},
		{
			exists: selectedItem[0] in workspacesRight.table,
			icon: TableRow,
			label: $_('workspace.view.table'),
			recommended: false,
			value: workspacesRight.table[selectedItem[0]] ?? '/all/table'
		}
	]);

	// svelte-ignore state_referenced_locally
	const leftMenu = createMenu({
		selected: pathnameWithoutContextSegment
	});

	// svelte-ignore state_referenced_locally
	const rightMenu = createMenu({
		selected: pathnameWithoutContextSegment
	});

	function handleChange(event: Event) {
		const detail = (event as CustomEvent).detail;

		if (detail.selected && detail.selected !== pathnameWithoutContextSegment) {
			const url = new URL(page.url);
			url.pathname = detail.selected;
			url.searchParams.delete('related-to');
			goto(url);
		}
	}
</script>

{#snippet dropdown(
	menu: ReturnType<typeof createMenu>,
	menuExpanded: boolean,
	menuActive: string,
	options: Option[]
)}
	{@const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom',
		strategy: 'absolute'
	})}
	{@const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	}}
	{@const selected = options.find(({ value }) => value === pathnameWithoutContextSegment)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" onchange={handleChange} type="button" use:menu.button>
			{#if selected?.icon}
				<selected.icon />
			{/if}
			<span class="is-visually-hidden">
				{selected?.label ?? $_('workspaces')}
			</span>
			{#if menuExpanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>
		{#if menuExpanded}
			<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
				<ul class="menu">
					{#each options as option (option.value)}
						<li
							class="menu-item"
							class:menu-item--active={option.value === menuActive}
							class:menu-item--muted={!option.exists}
							class:menu-item--selected={option.value === selected?.value}
						>
							<button type="button" use:menu.item={{ value: pathnamePrefix + option.value }}>
								<option.icon />
								{#if option.recommended}
									<span class="recommendation">
										<Star />
									</span>
								{/if}
								<span>{option.label}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/snippet}

<div class="dropdown-group">
	{@render dropdown(leftMenu, $leftMenu.expanded, $leftMenu.active, leftOptions)}
	{@render dropdown(rightMenu, $rightMenu.expanded, $rightMenu.active, rightOptions)}
</div>

<style>
	.dropdown {
		--dropdown-button-default-color: var(--color-gray-900);
		--dropdown-button-box-shadow: var(--shadow-sm);
		--dropdown-button-padding: 0.5rem 0.5rem 0.5rem 0.75rem;
		--dropdown-button-min-height: 2.25rem;
		--dropdown-panel-max-height: calc(100vh - 8rem);
	}

	.menu-item.menu-item--muted > button {
		--icon-color: var(--color-gray-400);

		color: var(--color-gray-400);
		gap: 0.625rem;
	}

	.menu-item.menu-item--selected > button {
		--icon-color: var(--color-primary-700);

		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.recommendation {
		--icon-color: var(--color-primary-500);

		height: 0.5rem;
		left: 2.125rem;
		position: absolute;
		top: 0;
		width: 0.5rem;
	}

	.dropdown-group {
		display: none;
		flex-direction: row;
		margin-left: auto;
	}

	@container (min-width: 24rem) {
		.dropdown-group {
			display: flex;
		}
	}

	.dropdown-group > .dropdown:first-child > .dropdown-button {
		border-bottom-right-radius: 0;
		border-top-right-radius: 0;
	}

	.dropdown-group > .dropdown:last-child > .dropdown-button {
		border-bottom-left-radius: 0;
		border-top-left-radius: 0;
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden {
				all: revert-layer;
			}
		}
	}
</style>
