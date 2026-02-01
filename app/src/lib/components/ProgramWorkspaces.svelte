<script lang="ts">
	import { type Component, getContext } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ColumnSolid from '~icons/flowbite/column-solid';
	import Grid from '~icons/flowbite/grid-solid';
	import TableRow from '~icons/flowbite/table-row-solid';
	import ChartBar from '~icons/knotdots/chart-bar';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import Compass from '~icons/knotdots/compass';
	import LandingPage from '~icons/knotdots/landing-page';
	import Level from '~icons/knotdots/level';
	import Objects from '~icons/knotdots/objects';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		type AnyContainer,
		boards,
		overlayKey,
		overlayURL,
		paramsFromFragment
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	let overlay = getContext('overlay');

	const workspacesLeft: Record<string, Record<string, string>> = {
		all: {
			level: '/all/level',
			page: '/',
			table: '/all/table'
		},
		indicators: {
			catalog: '/indicators/catalog'
		},
		measures: {
			monitoring: '/measures/monitoring',
			status: '/measures/status'
		}
	};

	const workspacesRight: Record<string, Record<string, string>> = {
		catalog: {
			indicators: '/indicators/catalog'
		},
		level: {
			all: '/all/level'
		},
		monitoring: {
			measures: '/measures/monitoring'
		},
		status: {
			measures: '/measures/status'
		},
		page: {
			all: '/'
		},
		table: {
			all: '/all/table'
		}
	};

	let selectedContext = page.data.currentOrganizationalUnit ?? page.data.currentOrganization;

	let selectedItem = $derived.by(() => {
		if (overlay) {
			const params = paramsFromFragment(page.url);

			if (params.has('chapters')) {
				return ['all', 'level'];
			} else if (params.has('view') && params.has('table')) {
				return ['all', 'table'];
			} else if (params.has('indicators')) {
				return ['indicators', 'catalog'];
			} else if (params.has('measures')) {
				return ['measures', 'status'];
			} else if (params.has('measure-monitoring')) {
				return ['measures', 'monitoring'];
			} else {
				return ['all', 'page'];
			}
		} else {
			const pathnameWithoutContextSegments = page.url.pathname.split('/').slice(3);

			if (pathnameWithoutContextSegments.length == 2) {
				return pathnameWithoutContextSegments;
			} else {
				return ['all', 'page'];
			}
		}
	});

	interface Option {
		exists: boolean;
		icon: Component<SvelteHTMLElements['svg']>;
		label: string;
		value: string;
	}

	let leftOptions: Option[] = $derived([
		{
			exists: true,
			icon: Objects,
			label: $_('workspace.type.all'),
			value: workspacesLeft.all[selectedItem[1]] ?? '/all/level'
		},
		{
			exists: true,
			icon: Clipboard,
			label: $_('workspace.type.measures'),
			value: workspacesLeft.measures[selectedItem[1]] ?? '/measures/status'
		},
		...(selectedContext.payload.boards.includes(boards.enum['board.indicators'])
			? [
					{
						exists: true,
						icon: ChartBar,
						label: $_('workspace.type.indicators'),
						value: workspacesLeft.indicators[selectedItem[1]] ?? '/indicators/catalog'
					}
				]
			: [])
	]);

	let rightOptions: Option[] = $derived([
		{
			exists: selectedItem[0] in workspacesRight.page,
			icon: LandingPage,
			label: $_('workspace.view.page'),
			value: workspacesRight.page[selectedItem[0]] ?? '/'
		},
		{
			exists: selectedItem[0] in workspacesRight.status,
			icon: ColumnSolid,
			label: $_('workspace.view.status'),
			value: workspacesRight.status[selectedItem[0]] ?? '/measures/status'
		},
		{
			exists: selectedItem[0] in workspacesRight.level,
			icon: Level,
			label: $_('workspace.view.level'),
			value: workspacesRight.level[selectedItem[0]] ?? '/all/level'
		},
		{
			exists: selectedItem[0] in workspacesRight.monitoring,
			icon: Compass,
			label: $_('workspace.view.monitoring'),
			value: workspacesRight.monitoring[selectedItem[0]] ?? '/measures/monitoring'
		},
		{
			exists: selectedItem[0] in workspacesRight.catalog,
			icon: Grid,
			label: $_('workspace.view.catalog'),
			value: workspacesRight.catalog[selectedItem[0]] ?? '/indicators/catalog'
		},
		{
			exists: selectedItem[0] in workspacesRight.table,
			icon: TableRow,
			label: $_('workspace.view.table'),
			value: workspacesRight.table[selectedItem[0]] ?? '/all/table'
		}
	]);

	function currentPath(url: URL) {
		if (overlay) {
			const params = paramsFromFragment(url);

			if (params.has('chapters')) {
				return '/all/level';
			} else if (params.has('view') && params.has('table')) {
				return '/all/table';
			} else if (params.has('indicators')) {
				return '/indicators/catalog';
			} else if (params.has('measures')) {
				return '/measures/status';
			} else if (params.has('measure-monitoring')) {
				return '/measures/monitoring';
			} else {
				return '/';
			}
		} else {
			return '/' + (url.pathname.split('/').slice(3).join('/') ?? '');
		}
	}

	const leftMenu = createMenu({
		selected: currentPath(page.url)
	});

	const rightMenu = createMenu({
		selected: currentPath(page.url)
	});

	function handleChange(url: URL, container: AnyContainer) {
		return (event: Event) => {
			const detail = (event as CustomEvent).detail;

			if (!detail.selected) {
				return;
			}

			const selected: [string, string] =
				detail.selected === '/' ? ['all', 'page'] : detail.selected.split('/').slice(1, 3);

			if (selected.every((v, i) => v === selectedItem[i])) {
				return;
			}

			if (selected[0] == 'all' && selected[1] == 'page') {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum.view, container.guid));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			} else if (selected[0] == 'all' && selected[1] == 'level') {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum.chapters, container.guid));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]/all/level', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			} else if (selected[0] == 'all' && selected[1] == 'table') {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum.view, container.guid, [['table', '']]));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			} else if (selected[0] == 'indicators' && selected[1] == 'catalog') {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum.indicators, container.guid));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]/indicators/catalog', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			} else if (selected[0] == 'measures' && selected[1] == 'status') {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum.measures, container.guid));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]/measures/status', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			} else if (selected[0] == 'measures' && selected[1] == 'monitoring') {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum['measure-monitoring'], container.guid));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]/measures/monitoring', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			} else {
				if (overlay) {
					goto(overlayURL(url, overlayKey.enum.view, container.guid));
				} else {
					goto(
						resolve('/[guid=uuid]/[contentGuid=uuid]', {
							guid: selectedContext.guid,
							contentGuid: container.guid
						})
					);
				}
			}
		};
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
	{@const selected = options.find(({ value }) => value === currentPath(page.url))}
	<div class="dropdown" use:popperRef>
		<button
			class="dropdown-button"
			onchange={handleChange(page.url, container)}
			type="button"
			use:menu.button
		>
			{#if selected?.icon}
				<selected.icon />
			{/if}
			<span class="is-visually-hidden is-visually-hidden--mobile-only">
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
							<button type="button" use:menu.item={{ value: option.value }}>
								{#if 'icon' in option}
									<option.icon />
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
		flex-shrink: 0;
	}

	.dropdown-button {
		--button-background: var(--color-gray-050);

		align-items: center;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		height: 2.25rem;
		padding: 0.5rem 0.5rem 0.5rem 0.75rem;
	}

	.dropdown-button {
		color: var(--color-gray-900);
		font-weight: 500;
	}

	.dropdown-button:global([aria-expanded='true']) {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.dropdown-button:global([aria-expanded='true'] svg) {
		color: var(--color-primary-700);
	}

	.dropdown-panel {
		max-height: calc(100vh - 8rem);
		max-width: revert;
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

	.dropdown-group {
		display: none;
		flex-direction: row;
		margin-left: auto;
	}

	@container (min-width: 40rem) {
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
