<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import { getContextIdentifier, pathnameWithoutContextSegment } from '$lib/models';
	import { ability, user } from '$lib/stores';
	import {
		getVisibleWorkspaces,
		groupWorkspacesByModule,
		workspaceFromPathname,
		type WorkspaceDefinition,
		type WorkspaceModuleKey,
		workspaceModules
	} from '$lib/workspaces';

	/**
	 * Defines which modules share a column in the mega-menu.
	 * Modules in the same sub-array are stacked vertically within one column.
	 */
	const megaMenuColumns: WorkspaceModuleKey[][] = [
		['goal_setting'],
		['implementation_planning'],
		['impact_measurement', 'resource_planning'],
		['knowledge_transfer', 'rules'],
		['organizing']
	];

	const features = $derived(createFeatureDecisions(page.data.features));

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let pathnameWithoutContext = $derived(
		pathnameWithoutContextSegment(page.url.pathname, selectedContext)
	);

	let currentWorkspace = $derived(workspaceFromPathname(pathnameWithoutContext));

	const isOnPage = $derived(
		pathnameWithoutContext === '/all/page' ||
			pathnameWithoutContext === '' ||
			pathnameWithoutContext === '/'
	);

	const visible = $derived(
		getVisibleWorkspaces({
			organization: page.data.currentOrganization,
			organizationalUnit: page.data.currentOrganizationalUnit,
			features,
			ability: $ability,
			user: $user
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

	function pathFor(workspace: WorkspaceDefinition): string {
		return `/${getContextIdentifier(selectedContext)}${workspace.views.default}`;
	}

	function handleChange(event: Event) {
		const detail = (event as CustomEvent).detail;
		if (detail.selected) {
			menu.close();
			goto(detail.selected);
		}
	}
</script>

<div class="mega-menu">
	<button
		class={[
			'dropdown-button',
			workspaceModules.find((m) => m.key === currentWorkspace?.module)?.colorClass
		]}
		onchange={handleChange}
		type="button"
		use:menu.button
	>
		{#if currentWorkspace && !isOnPage}
			<currentWorkspace.icon />
			<span>{$_(`workspace.${currentWorkspace.key}.title`)}</span>
		{:else}
			<span>{$_('workspace.choose')}</span>
		{/if}
		<ChevronSort />
	</button>

	{#if $menu.expanded}
		<div class="mega-menu-panel" use:menu.items>
			{#each columns as column, colIdx (colIdx)}
				<div class="mega-menu-column">
					{#each column as group (group.module.key)}
						<section class="menu-segment {group.module.colorClass}">
							<header class="menu-segment-header">
								<h2>{$_(`workspace.module.${group.module.key}`)}</h2>
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
												<span class="menu-segment-item-label">
													{$_(`workspace.${workspace.key}.title`)}
												</span>
												<span class="menu-segment-item-helper">
													{$_(`workspace.${workspace.key}.description`)}
												</span>
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
	.mega-menu-panel {
		background-color: var(--color-white);
		border-radius: 0 0 1rem 1rem;
		box-shadow: var(--shadow-xl);
		container-name: mega-menu;
		container-type: inline-size;
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		left: 0;
		max-height: calc(100vh - var(--header-height));
		overflow: auto;
		padding: 0.375rem;
		position: absolute;
		right: 0;
	}

	.mega-menu-column {
		display: flex;
		flex: 1 1 100%;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	@container (min-width: 30rem) {
		.mega-menu-panel {
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.mega-menu-column {
			flex-basis: 13.75rem;
		}
	}

	@container (min-width: 60rem) {
		.mega-menu-column {
			flex: 1 1 0;
		}
	}

	.menu-segment {
		background-color: var(--color-surface-accent-container-raised);
		background-image: linear-gradient(
			205deg,
			rgba(255, 255, 255, 0.75) 1%,
			rgba(255, 255, 255, 0) 98%
		);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 0.5rem;
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
		color: var(--color-text-accent-subtle);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0;
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
		border-radius: 6px;
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
		background-color: rgb(from var(--color-background-accent-hover) r g b / 0.1);
	}

	.menu-segment-item--current > button {
		background-color: var(--color-background-accent-expanded);
	}

	.menu-segment-item-icon {
		align-items: center;
		background-color: var(--color-background-accent-strong);
		border-radius: 8px;
		color: var(--color-icon-accent-default);
		display: inline-flex;
		flex-shrink: 0;
		height: 1.5rem;
		justify-content: center;
		padding: 0.25rem;
		width: 1.5rem;
	}

	.menu-segment-item-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.menu-segment-item-label {
		color: var(--color-text-default);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
	}

	.menu-segment-item-helper {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		line-height: 1.5;
	}
</style>
