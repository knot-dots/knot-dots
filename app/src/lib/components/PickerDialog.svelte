<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Sort from '~icons/flowbite/sort-outline';
	import Close from '~icons/knotdots/close';
	import Filter from '~icons/knotdots/filter';
	import SearchInput from '$lib/components/SearchInput.svelte';

	interface Props {
		dialog?: HTMLDialogElement;
		title: string;
		filterBar: ReturnType<typeof createDisclosure>;
		sortBar: ReturnType<typeof createDisclosure>;
		activeFilters: number;
		terms: string;
		onResetFilters: () => void;
		// Snippets for customization
		commands?: Snippet;
		filterContent: Snippet;
		sortContent: Snippet;
		sidebar?: Snippet;
		main: Snippet;
		selection?: Snippet;
	}

	let {
		dialog = $bindable(),
		title,
		filterBar,
		sortBar,
		activeFilters,
		terms = $bindable(),
		onResetFilters,
		commands,
		filterContent,
		sortContent,
		sidebar,
		main,
		selection
	}: Props = $props();
</script>

<dialog bind:this={dialog} oninput={(e) => e.stopPropagation()}>
	<div>
		<header>
			<div class="title">
				<span>{title}</span>
				<button class="action-button" onclick={() => dialog?.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('cancel')}</span>
				</button>
			</div>

			<div class="commands">
				<div class="commands-leading">
					{#if commands}
						{@render commands()}
					{/if}
				</div>

				<div class="commands-trailing">
					<SearchInput bind:value={terms} />

					<button
						class="dropdown-button dropdown-button--command"
						onclick={() => sortBar.close()}
						type="button"
						use:filterBar.button
					>
						<Filter />
						<span class="is-visually-hidden is-visually-hidden--mobile-only">{$_('filter')}</span>
						{#if activeFilters > 0 && !$filterBar.expanded}
							<span class="indicator">{activeFilters}</span>
						{/if}
					</button>

					<button
						class="dropdown-button dropdown-button--command"
						onclick={() => filterBar.close()}
						type="button"
						use:sortBar.button
					>
						<Sort />
						<span class="is-visually-hidden">{$_('sort')}</span>
					</button>
				</div>
			</div>

			{#if $filterBar.expanded || $sortBar.expanded}
				<div class="filter-and-sort">
					{#if $filterBar.expanded}
						<fieldset use:filterBar.panel>
							{#if activeFilters > 0}
								<span class="active-filters">
									{$_('active_filters', { values: { count: activeFilters } })}
								</span>

								<button class="button-outline button-xs" onclick={onResetFilters} type="button">
									<Close />
								</button>
							{/if}

							{@render filterContent()}
						</fieldset>
					{:else}
						<fieldset use:sortBar.panel>
							{@render sortContent()}
						</fieldset>
					{/if}
				</div>
			{/if}
		</header>

		<div class="picker-layout" class:has-sidebar={!!sidebar} class:has-selection={!!selection}>
			{#if sidebar}
				<aside class="picker-sidebar">
					{@render sidebar()}
				</aside>
			{/if}

			<main class="picker-main">
				{@render main()}
			</main>

			{#if selection}
				<aside class="picker-selection">
					{@render selection()}
				</aside>
			{/if}
		</div>
	</div>
</dialog>

<style>
	dialog {
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;

		--icon-color: var(--color-gray-500);
		--indicator-background-color: var(--color-primary-700);

		background-color: var(--color-gray-025);
		border: solid 1px var(--color-gray-200);
		border-color: var(--color-white);
		border-radius: 24px;
		box-shadow: var(--shadow-2xl);
		color: var(--color-gray-500);
		container-type: inline-size;
		height: calc(100vh - 3rem);
		padding: 1.5rem;
		width: calc(100vw - 10rem);
	}

	dialog::backdrop {
		backdrop-filter: blur(12px) brightness(0.75);
	}

	header {
		align-items: stretch;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.title {
		align-items: center;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		min-width: 0;
	}

	.title > span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	dialog > div {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.commands {
		align-items: center;
		display: flex;
		flex-direction: row;
		flex-shrink: 0;
		gap: 0.75rem;
		justify-content: space-between;
		min-width: 0;
	}

	.commands-leading {
		align-items: center;
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		margin-right: auto;
		min-width: 0;
	}

	.commands-trailing {
		align-items: center;
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		margin-left: auto;
		min-width: 0;
	}

	.commands-leading > :global(*),
	.commands-trailing > :global(*) {
		width: fit-content;
	}

	.dropdown-button.dropdown-button--command {
		--dropdown-button-default-background: transparent;
		--dropdown-button-padding: 0 0.5rem 0 0.375rem;

		height: 2rem;
		position: relative;
	}

	.filter-and-sort > fieldset {
		align-items: center;
		background-color: var(--color-primary-050);
		border: solid 1px var(--color-primary-200);
		border-radius: calc(infinity * 1px);
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		margin-left: auto;
		max-width: 100%;
		overflow: auto;
		padding: 0.5rem 1rem;
		width: fit-content;
	}

	.active-filters {
		color: var(--dropdown-button-expanded-color);
		white-space: nowrap;
	}

	.indicator {
		position: absolute;
		right: -0.375rem;
		top: -0.375rem;
	}

	.picker-layout {
		--picker-sidebar-width: 13rem;
		--picker-selection-width: 20rem;
		--picker-layout-gap: 1.5rem;

		display: grid;
		flex: 1 1 auto;
		gap: var(--picker-layout-gap);
		grid-template-columns: minmax(0, 1fr);
		min-height: 0;
	}

	.picker-layout.has-sidebar {
		grid-template-columns: var(--picker-sidebar-width) minmax(0, 1fr);
	}

	.picker-layout.has-selection {
		grid-template-columns: minmax(0, 1fr) var(--picker-selection-width);
	}

	.picker-layout.has-sidebar.has-selection {
		grid-template-columns: var(--picker-sidebar-width) minmax(0, 1fr) var(--picker-selection-width);
	}

	.picker-sidebar,
	.picker-main,
	.picker-selection {
		display: flex;
		flex-direction: column;
		min-height: 0;
		min-width: 0;
	}

	.picker-sidebar > :global(*),
	.picker-main > :global(*),
	.picker-selection > :global(*) {
		flex: 1 1 auto;
		min-height: 0;
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden.is-visually-hidden--mobile-only {
				all: revert-layer;
			}
		}
	}
</style>
