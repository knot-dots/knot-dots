<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-solid';
	import { page } from '$app/state';
	import { updateManyContainers } from '$lib/client/performBulkAction';
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

	function updateSelection(event: Event & { currentTarget: HTMLInputElement }) {
		if (!event.currentTarget.checked) {
			bulkActionContext.selected.clear();
		} else {
			document
				.querySelectorAll('input[name="bulkActionContextSelection"]:not(:checked)')
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
			if (e instanceof Error) {
				toast({ heading: $_('toast.bulk_actions.error'), message: e.message, status: 'error' });
			} else {
				toast({
					heading: $_('toast.bulk_actions.error'),
					status: 'error'
				});
			}
		} finally {
			isLoading = false;
			payload = { status: undefined, visibility: undefined };
		}
	}

	const checkState: Attachment<HTMLInputElement> = (element) => {
		if (bulkActionContext.selected.size == 0) {
			element.indeterminate = false;
		} else if (selectAllResultCount != bulkActionContext.selected.size) {
			element.indeterminate = true;
		}
	};
</script>

{#if bulkActionContext}
	<fieldset class={{ 'is-visible-on-hover': bulkActionContext.selected.size == 0 }}>
		<legend class="is-visually-hidden">{$_('bulk_actions')}</legend>

		<label>
			<input
				{@attach checkState}
				name="bulkActionContextSelectAll"
				onchange={updateSelection}
				type="checkbox"
			/>
			<span class="is-visually-hidden">{$_('select_all')}</span>
		</label>

		<span class="selection-counter">
			{$_('selection_counter', { values: { count: bulkActionContext.selected.size } })}
		</span>

		{#each bulkActionContext.actions as action (action)}
			{#if action === 'status'}
				<BulkActionDropdown
					disabled={isLoading || bulkActionContext.selected.size == 0}
					label={$_('status')}
					onchange={() => performBulkAction({ payload })}
					options={status.options.map((o) => ({ value: o, label: $_(o) }))}
					bind:value={payload.status}
				/>
			{:else if action === 'visibility'}
				<BulkActionDropdown
					disabled={isLoading || bulkActionContext.selected.size == 0}
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
					disabled={isLoading || bulkActionContext.selected.size == 0}
					name="delete"
					onclick={() => dialog.showModal()}
					type="button"
				>
					<TrashBin />
					<span>{$_('delete')}</span>
				</button>
			{/if}
		{/each}
	</fieldset>

	<ConfirmBulkDeleteDialog
		bind:dialog
		count={bulkActionContext.selected.size}
		handleSubmit={() => performBulkAction({ deleted: true })}
	/>
{/if}

<style>
	fieldset {
		border: 1px solid var(--color-border-subtle);
		border-radius: calc(infinity * 1px);
		box-shadow: var(--shadow-md);
		display: flex;
		padding: 0;
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
