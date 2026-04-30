<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import { payloadTypes } from '$lib/models';
	import { mayCreateContainer, overlay, overlayWidth } from '$lib/stores';
	import {
		getVisibleWorkspaces,
		groupWorkspacesByModule,
		workspaceFromPathname,
		type WorkspaceDefinition,
		type WorkspaceModuleKey
	} from '$lib/workspaces';

	/**
	 * Defines which modules share a column in the mega-menu.
	 * Modules in the same sub-array are stacked vertically within one column.
	 */
	const megaMenuColumns: WorkspaceModuleKey[][] = [
		['goals_planning'],
		['implementation_planning'],
		['effect_measurement', 'resource_planning'],
		['knowledge_transfer', 'rules'],
		['organizing']
	];

	const features = $derived(createFeatureDecisions(page.data.features));

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let pathnameWithoutContextSegment = $derived.by(() => {
		const segments = page.url.pathname.split('/');
		if (segments.length > 1 && segments[1] === selectedContext.guid) {
			return [segments.slice(0, 1), ...segments.slice(2)].join('/');
		}
		return page.url.pathname;
	});

	let currentWorkspace = $derived(workspaceFromPathname(pathnameWithoutContextSegment));

	const isOnPage = $derived(
		pathnameWithoutContextSegment === '/all/page' ||
			pathnameWithoutContextSegment === '' ||
			pathnameWithoutContextSegment === '/'
	);

	const visible = $derived(
		getVisibleWorkspaces({
			organization: page.data.currentOrganization,
			organizationalUnit: page.data.currentOrganizationalUnit,
			features,
			hasPermission: (key) => {
				if (key === 'categories') {
					return $mayCreateContainer(payloadTypes.enum.category, selectedContext.guid);
				}
				if (key === 'tasks') {
					// Hidden on default organization (consistent with previous behavior).
					return !('default' in selectedContext.payload) || !selectedContext.payload.default;
				}
				return true;
			}
		})
	);

	const grouped = $derived(groupWorkspacesByModule(visible));

	const columns = $derived(
		megaMenuColumns
			.map((moduleKeys) =>
				moduleKeys.map((key) => grouped.find((g) => g.module.key === key)).filter((g) => g != null)
			)
			.filter((col) => col.length > 0)
	);

	const menu = createMenu({});

	let buttonEl: HTMLButtonElement;

	const panelTop = $derived.by(() => {
		if (!$menu.expanded || !buttonEl) return 0;
		const header = buttonEl.closest('header');
		if (!header) return 0;
		return header.getBoundingClientRect().bottom;
	});

	const panelRight = $derived($overlay ? `calc(100vw * ${$overlayWidth})` : '0');

	function pathFor(workspace: WorkspaceDefinition): string {
		return `/${selectedContext.guid}${workspace.views.default}`;
	}

	function handleChange(event: Event) {
		const detail = (event as CustomEvent).detail;
		if (detail.selected) {
			const url = new URL(page.url);
			url.pathname = detail.selected;
			url.searchParams.delete('related-to');
			menu.close();
			goto(url);
		}
	}
</script>

<div class="mega-menu">
	<button
		bind:this={buttonEl}
		class="dropdown-button"
		onchange={handleChange}
		type="button"
		use:menu.button
	>
		{#if currentWorkspace && !isOnPage}
			<currentWorkspace.icon />
			<span class="label">{$_(currentWorkspace.i18nKey)}</span>
		{:else}
			<span class="label">{$_('workspace.choose')}</span>
		{/if}
		{#if $menu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $menu.expanded}
		<div class="mega-menu-panel" style:top="{panelTop}px" style:right={panelRight} use:menu.items>
			{#each columns as column, colIdx (colIdx)}
				<div class="mega-menu-column">
					{#each column as group (group.module.key)}
						<section class="menu-segment {group.module.colorClass}">
							<header class="menu-segment-header">
								<h2>{$_(group.module.i18nKey)}</h2>
							</header>
							<ul class="menu-segment-items">
								{#each group.workspaces as workspace (workspace.key)}
									{@const path = pathFor(workspace)}
									{@const isCurrent = !isOnPage && currentWorkspace?.key === workspace.key}
									<li class="menu-segment-item" class:menu-segment-item--current={isCurrent}>
										<button type="button" use:menu.item={{ value: path }}>
											<span class="menu-segment-item-icon">
												<workspace.icon />
											</span>
											<span class="menu-segment-item-text">
												<span class="menu-segment-item-label">{$_(workspace.i18nKey)}</span>
												<span class="menu-segment-item-helper">{$_(workspace.helperI18nKey)}</span>
											</span>
										</button>
									</li>
								{/each}
							</ul>
						</section>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.mega-menu {
		--dropdown-button-default-color: var(--color-gray-900);
		--dropdown-button-box-shadow: var(--shadow-sm);
		--dropdown-button-padding: 0.5rem 0.5rem 0.5rem 0.75rem;
		--dropdown-button-min-height: 2.25rem;

		position: relative;
	}

	.dropdown-button {
		align-items: center;
		background-color: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 0.375rem;
		box-shadow: var(--dropdown-button-box-shadow);
		color: var(--dropdown-button-default-color);
		cursor: pointer;
		display: inline-flex;
		gap: 0.5rem;
		min-height: var(--dropdown-button-min-height);
		padding: var(--dropdown-button-padding);
	}

	.dropdown-button:hover {
		background-color: var(--color-gray-050);
	}

	.label {
		font-weight: 500;
	}

	.mega-menu-panel {
		background-color: var(--color-white);
		border-radius: 0 0 1rem 1rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px 0 rgba(0, 0, 0, 0.04);
		container-name: mega-menu;
		container-type: inline-size;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		left: var(--sidebar-max-width);
		max-height: calc(100vh - var(--header-height));
		overflow: auto;
		padding: 0.5rem;
		position: fixed;
		right: 0;
		z-index: 100;
	}

	.mega-menu-column {
		display: flex;
		flex: 1 1 220px;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	@container mega-menu (max-width: 30rem) {
		.mega-menu-panel {
			gap: 0.375rem;
			padding: 0.375rem;
		}

		.mega-menu-column {
			flex-basis: 100%;
		}
	}

	@container mega-menu (min-width: 60rem) {
		.mega-menu-column {
			flex: 1 1 0;
		}
	}

	.menu-segment {
		--menu-segment-bg: var(--color-gray-050);
		--menu-segment-fg: var(--color-gray-900);
		--menu-segment-accent: var(--color-gray-300);
		--menu-segment-border: var(--menu-segment-bg);

		background-color: var(--menu-segment-bg);
		background-image: linear-gradient(
			205deg,
			rgba(255, 255, 255, 0.75) 1%,
			rgba(255, 255, 255, 0) 98%
		);
		border: 1px solid var(--menu-segment-border);
		border-radius: 0.5rem;
		color: var(--menu-segment-fg);
		display: flex;
		flex: 1 0 0;
		flex-direction: column;
		overflow: clip;
		padding: 0;
	}

	.menu-segment-header {
		padding: 1rem 0.75rem 0.5rem;
	}

	.menu-segment-header > h2 {
		color: var(--menu-segment-fg);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		margin: 0;
		text-transform: uppercase;
	}

	.menu-segment-items {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.menu-segment-item > button {
		align-items: flex-start;
		background: transparent;
		border: 0;
		border-radius: 0.375rem;
		color: inherit;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding: 0.5rem 0.5rem 0.375rem;
		text-align: left;
		width: 100%;
	}

	.menu-segment-item > button:hover,
	.menu-segment-item > button:focus-visible {
		background-color: var(--color-white);
	}

	.menu-segment-item--current > button {
		background-color: var(--color-white);
		box-shadow: inset 0 0 0 2px var(--menu-segment-accent);
	}

	.menu-segment-item-icon {
		--icon-color: var(--menu-segment-accent);

		align-items: center;
		background-color: var(--color-white);
		border-radius: 0.375rem;
		display: inline-flex;
		flex-shrink: 0;
		height: 2rem;
		justify-content: center;
		width: 2rem;
	}

	.menu-segment-item-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.menu-segment-item-label {
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.menu-segment-item-helper {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.menu-segment.menu-segment--goals {
		--menu-segment-bg: #d1ebfa;
		--menu-segment-fg: #3980ac;
		--menu-segment-accent: #8cbbd9;
		--menu-segment-border: #d1ebfa;
	}

	.menu-segment.menu-segment--implementation {
		--menu-segment-bg: #fce4de;
		--menu-segment-fg: #af4d36;
		--menu-segment-accent: #f5a694;
		--menu-segment-border: #fce4de;
	}

	.menu-segment.menu-segment--effects {
		--menu-segment-bg: #d5f5f6;
		--menu-segment-fg: #0b808e;
		--menu-segment-accent: #82dde3;
		--menu-segment-border: #d5f5f6;
	}

	.menu-segment.menu-segment--resources {
		--menu-segment-bg: #fff7cc;
		--menu-segment-fg: #d5b40b;
		--menu-segment-accent: #fbde51;
		--menu-segment-border: #fff7cc;
	}

	.menu-segment.menu-segment--knowledge {
		--menu-segment-bg: #d1fadf;
		--menu-segment-fg: #039855;
		--menu-segment-accent: #6ce9a6;
		--menu-segment-border: #d1fadf;
	}

	.menu-segment.menu-segment--rules {
		--menu-segment-bg: #f7e8ee;
		--menu-segment-fg: #b83d6a;
		--menu-segment-accent: #efbdcf;
		--menu-segment-border: #f7e8ee;
	}

	.menu-segment.menu-segment--organize {
		--menu-segment-bg: #e7e4fc;
		--menu-segment-fg: #824eda;
		--menu-segment-border: #e7e4fc;
		--menu-segment-accent: #c7bef4;
	}
</style>
