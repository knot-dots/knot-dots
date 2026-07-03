<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-solid';
	import { page } from '$app/state';
	import { updateManyContainers } from '$lib/client/updateManyContainers';
	import BulkActionDropdown from '$lib/components/BulkActionDropdown.svelte';
	import ConfirmBulkDeleteDialog from '$lib/components/ConfirmBulkDeleteDialog.svelte';
	import { getBulkActionContext } from '$lib/contexts/bulkAction';
	import { getToastContext } from '$lib/contexts/toast';
	import { status, visibility } from '$lib/models';

	interface UpdateAction {
		payload: { status: undefined; visibility: undefined };
	}

	interface DeleteAction {
		deleted: true;
	}

	const bulkActionContext = getBulkActionContext();

	const toast = getToastContext();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	let payload = $state<UpdateAction['payload']>({ status: undefined, visibility: undefined });

	let isLoading = $state(false);

	let selectAllResultCount = $state(0);

	let selectAllChecked = $state(false);

	function updateSelection(event: Event & { currentTarget: HTMLInputElement }) {
		if (!event.currentTarget.checked) {
			bulkActionContext.selected.clear();
		} else {
			document
				.querySelectorAll(`input[name="${bulkActionContext.name}"]:not(:checked)`)
				.forEach((node) => {
					(node as HTMLInputElement).click();
				});
			selectAllResultCount = bulkActionContext.selected.size;
		}
	}

	async function performBulkAction(action: DeleteAction | UpdateAction) {
		isLoading = true;

		try {
			const affectedContainers = await updateManyContainers({
				...action,
				guid: [...bulkActionContext.selected],
				organization: page.data.currentOrganization.guid,
				organizational_unit: page.data.currentOrganizationalUnit?.guid ?? null
			});
			bulkActionContext.selected.clear();
			selectAllChecked = false;
			toast({
				heading:
					'deleted' in action
						? $_('toast.bulk_actions.delete_success', {
								values: { count: affectedContainers.length }
							})
						: $_('toast.bulk_actions.update_success', {
								values: { count: affectedContainers.length }
							}),
				status: 'success'
			});
		} catch (e) {
			toast({
				heading: $_('toast.bulk_actions.error'),
				message: e instanceof Error ? e.message : undefined,
				status: 'error'
			});
		} finally {
			isLoading = false;
			payload = { status: undefined, visibility: undefined };
		}
	}

	let selectAllIndeterminate = $derived(
		bulkActionContext.selected.size > 0 && bulkActionContext.selected.size !== selectAllResultCount
	);
</script>

{#if bulkActionContext}
	<fieldset class={{ 'has-selection': bulkActionContext.selected.size > 0 }}>
		<legend class="is-visually-hidden">{$_('bulk_actions')}</legend>

		<label>
			<input
				bind:checked={selectAllChecked}
				bind:indeterminate={selectAllIndeterminate}
				name="bulkActionContextSelectAll"
				onchange={updateSelection}
				type="checkbox"
			/>
			<span>
				{selectAllChecked ? $_('clear_selection') : $_('select_all')}
			</span>
		</label>

		{#if bulkActionContext.selected.size > 0}
			<span class="selection-counter">
				{$_('selection_counter', { values: { count: bulkActionContext.selected.size } })}
			</span>

			{#each bulkActionContext.actions as action (action)}
				{#if action === 'status'}
					<BulkActionDropdown
						disabled={isLoading}
						label={$_('status')}
						onchange={() => performBulkAction({ payload })}
						options={status.options.map((o) => ({ value: o, label: $_(o) }))}
						bind:value={payload.status}
					/>
				{:else if action === 'visibility'}
					<BulkActionDropdown
						disabled={isLoading}
						label={$_('visibility.label')}
						onchange={() => performBulkAction({ payload })}
						options={visibility.options
							.filter((o) => o != visibility.enum.creator)
							.map((o) => ({ value: o, label: $_(`visibility.${o}`) }))}
						bind:value={payload.visibility}
					/>
				{:else if action === 'delete'}
					<button
						class="action-button"
						disabled={isLoading}
						name="delete"
						onclick={() => dialog.showModal()}
						type="button"
					>
						<TrashBin />
						<span>{$_('delete')}</span>
					</button>
				{/if}
			{/each}
		{/if}
	</fieldset>

	<ConfirmBulkDeleteDialog bind:dialog handleSubmit={() => performBulkAction({ deleted: true })} />
{/if}

<style>
	fieldset {
		border: 1px solid transparent;
		display: flex;
		padding: 0;
	}

	.has-selection {
		border: 1px solid var(--color-border-subtle);
		border-radius: calc(infinity * 1px);
		box-shadow: var(--shadow-md);
	}

	label {
		padding: 0 0.5rem 0 1rem;
	}

	.selection-counter {
		color: var(--color-primary-700);
		margin: auto 0;
		padding: 0 0.5rem;
		white-space: nowrap;
	}

	.action-button {
		border-radius: calc(infinity * 1px);
		font-size: 0.875rem;
		padding: 0 1rem;
	}

	@media (hover: hover) {
		fieldset:hover {
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
