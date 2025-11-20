<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { type AnyContainer, visibility } from '$lib/models';
	import { sectionOf } from '$lib/relations';
	import { ability } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let popover = createPopover({ label: $_('settings') });

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	async function handleDelete(container: AnyContainer) {
		const response = await deleteContainer(container);

		if (response.ok) {
			parentContainer.relation = parentContainer.relation.filter(
				({ subject }) => subject !== container.guid
			);
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== container.guid);
		}

		dialog.close();
	}
</script>

{#if $ability.can('update', container, 'visibility') || $ability.can('delete', container)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" use:popover.button>
			<Ellipsis />
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				<div>
					{#if $ability.can('update', container, 'visibility')}
						<p class="dropdown-panel-title">{$_('container_settings_dropdown.title')}</p>
						<p class="dropdown-panel-group-title">
							{$_('container_settings_dropdown.visibility.title')}
						</p>
						{#each visibility.options.map( (o) => ({ value: o, label: $_(`visibility.${o}`) }) ) as option (option.value)}
							<label>
								<input
									type="radio"
									value={option.value}
									bind:group={container.payload.visibility}
								/>
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
				</div>
			</fieldset>
		{/if}
	</div>

	<ConfirmDeleteDialog
		bind:dialog
		{container}
		handleSubmit={() => handleDelete(container)}
		{relatedContainers}
	/>
{/if}

<style>
	.dropdown-panel {
		border-radius: 16px;
	}

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

	.dropdown-panel .action-button {
		color: var(--color-red-500);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}

	.dropdown-panel .action-button span {
		color: var(--color-gray-500);
	}
</style>
