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
		filterContent: Snippet;
		sortContent: Snippet;
		content: Snippet;
	}

	let {
		dialog = $bindable(),
		title,
		filterBar,
		sortBar,
		activeFilters,
		terms = $bindable(),
		onResetFilters,
		filterContent,
		sortContent,
		content
	}: Props = $props();
</script>

<dialog bind:this={dialog} oninput={(e) => e.stopPropagation()}>
	<div>
		<div class="commands">
			<span>{title}</span>

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
			{:else if $sortBar.expanded}
				<fieldset use:sortBar.panel>
					{@render sortContent()}
				</fieldset>
			{/if}
		</div>

		{@render content()}
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
		border-radius: 8px;
		box-shadow: var(--shadow-2xl);
		color: var(--color-gray-500);
		container-type: inline-size;
		height: calc(100vh - 3rem);
		padding: 1.5rem;
		width: calc(100vw - 10rem);
	}

	dialog > div {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.commands {
		align-items: center;
		display: flex;
		flex-direction: row;
		flex-shrink: 0;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.commands > span {
		margin-right: auto;
	}

	.commands > :global(*) {
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
		overflow: auto;
		margin-left: auto;
		max-width: 100%;
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

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden.is-visually-hidden--mobile-only {
				all: revert-layer;
			}
		}
	}
</style>
