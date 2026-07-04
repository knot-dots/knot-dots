<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dragHandle } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import DragHandle from '~icons/knotdots/draghandle';
	import { getBulkActionContext } from '$lib/contexts/bulkAction';
	import type { AnyContainer } from '$lib/models';
	import { createFeatureDecisions } from '$lib/features';
	import { page } from '$app/state';

	type Props = {
		actions?: Snippet;
		container: AnyContainer;
	};

	let { actions, container }: Props = $props();

	const bulkActionContext = getBulkActionContext();
</script>

<div class="actions is-visible-on-hover">
	{#if createFeatureDecisions(page.data.features).useBulkActions() && bulkActionContext}
		<label class="bulk-action">
			<input
				bind:checked={
					() => bulkActionContext.selected.has(container.guid),
					() =>
						bulkActionContext.selected.has(container.guid)
							? bulkActionContext.selected.delete(container.guid)
							: bulkActionContext.selected.add(container.guid)
				}
				name={bulkActionContext.name}
				onclick={(e) => e.stopPropagation()}
				oninput={(e) => e.stopPropagation()}
				type="checkbox"
			/>
			<span class="is-visually-hidden">{$_('bulk_actions_select')}</span>
		</label>
	{/if}
	{#if actions}{@render actions()}{/if}
	<span class="drag-handle" use:dragHandle>
		<DragHandle />
	</span>
</div>

<style>
	.actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;

		align-items: center;
		background-color: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		gap: 0.25rem;
		left: var(--actions-left, -5rem);
		padding: 0.25rem;
		position: absolute;
		top: var(--actions-top, 1.25rem);
		z-index: 1;
	}

	.actions:has(input[type='checkbox']:checked) {
		--is-visible-on-hover-visibility: visible;
	}

	.bulk-action {
		height: 1.5rem;
		width: 1.5rem;
	}

	.bulk-action > input {
		margin: auto;
	}

	.drag-handle {
		padding: 0.25rem;
	}

	.drag-handle :global(svg) {
		color: var(--dropdown-button-icon-default-color);
		height: 1rem;
		width: 1rem;
	}
</style>
