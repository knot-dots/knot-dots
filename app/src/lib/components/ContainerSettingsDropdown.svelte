<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { type AnyPayload, type Container } from '$lib/models';
	import { ability } from '$lib/stores';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: Container<AnyPayload>;
		ondelete?: () => Promise<void>;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		ondelete,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	async function handleDelete(container: Container<AnyPayload>) {
		const response = await deleteContainer(container);

		if (response.ok) {
			parentContainer.relation = parentContainer.relation.filter(
				({ subject }) => subject !== container.guid
			);
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== container.guid);
		}

		if (ondelete) {
			await ondelete();
		}

		dialog.close();
	}
</script>

{#if $ability.can('update', container, 'payload.visibility') || $ability.can('delete', container)}
	<Dropdown
		--dropdown-panel-background="var(--color-gray-025)"
		--dropdown-panel-border-radius="16px"
		label={$_('settings')}
		offset={[0, 4]}
	>
		{#snippet button(popover)}
			<button class="dropdown-button" use:popover.button>
				<Ellipsis />
			</button>
		{/snippet}

		{#snippet panel()}
			<fieldset class="listbox">
				{#if $ability.can('update', container, 'payload.visibility')}
					<p class="dropdown-panel-title">{$_('container_settings_dropdown.title')}</p>
					<p class="dropdown-panel-group-title">
						{$_('container_settings_dropdown.visibility.title')}
					</p>
					{#each visibilityOptions(container, relatedContainers) as option (option.value)}
						<label>
							<input type="radio" value={option.value} bind:group={container.payload.visibility} />
							<span class="truncated">{option.label}</span>
						</label>
					{/each}
				{/if}

				{#if $ability.can('delete', container)}
					<p class="dropdown-panel-group-title">
						{$_('container_settings_dropdown.delete.title')}
					</p>
					<button
						class="action-button action-button--padding-tight"
						onclick={() => dialog.showModal()}
						type="button"
					>
						<TrashBin />
						<span>{$_('delete')}</span>
					</button>
				{/if}
			</fieldset>
		{/snippet}
	</Dropdown>

	<ConfirmDeleteDialog
		bind:dialog
		{container}
		handleSubmit={() => handleDelete(container)}
		{relatedContainers}
	/>
{/if}

<style>
	.dropdown-panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
	}

	.dropdown-panel-group-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.75rem;
	}

	.action-button {
		color: var(--color-red-500);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}

	.action-button span {
		color: var(--color-gray-500);
	}
</style>
