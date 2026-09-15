<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import Eye from '~icons/flowbite/eye-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import Progress from '~icons/knotdots/progress';
	import deleteContainer from '$lib/client/deleteContainer';
	import CascadingMenu from '$lib/components/CascadingMenu.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		progressMeasurement,
		type ProgressPayload
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: Container<ProgressPayload>;
		ondelete?: () => Promise<void>;
		onmeasurementchange?: () => Promise<void>;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		ondelete,
		onmeasurementchange,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

	let visibilityLabel = $derived(
		visibilityOptions(container, relatedContainers).find(
			({ value }) => value === container.payload.visibility
		)?.label ?? $_(`visibility.${container.payload.visibility}`)
	);

	async function handleDelete() {
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

		confirmDeleteDialog.close();
	}
</script>

{#if $ability.can('update', container, 'payload.visibility') || $ability.can('update', container) || $ability.can('delete', container)}
	<CascadingMenu title={$_('container_settings_dropdown.title')}>
		{#snippet children(openSubMenuTitle, openSubMenu, closeMenu)}
			{#if openSubMenuTitle === ''}
				{#if $ability.can('update', container, 'payload.visibility')}
					<button
						class="cascading-menu-item"
						onclick={() => openSubMenu($_('container_settings_dropdown.visibility.title'))}
						type="button"
					>
						<Eye />
						<span>
							<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
							<small>{visibilityLabel}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if createFeatureDecisions(page.data.features).useComputedProgress() && $ability.can('update', container)}
					<button
						class="cascading-menu-item"
						onclick={() => openSubMenu($_('progress_measurement'))}
						type="button"
					>
						<Progress />
						<span>
							<strong>{$_('progress_measurement')}</strong>
							<small>{$_(`progress_measurement.${container.payload.measurement}`)}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if $ability.can('delete', container)}
					<div class="cascading-menu-divider" role="presentation"></div>
					<button
						class="cascading-menu-item system-danger"
						onclick={() => {
							closeMenu();
							confirmDeleteDialog.showModal();
						}}
						type="button"
					>
						<TrashBin />
						<span>
							<strong>{$_('container_settings_dropdown.delete.title')}</strong>
						</span>
					</button>
				{/if}
			{:else if openSubMenuTitle === $_('container_settings_dropdown.visibility.title')}
				<fieldset class="listbox">
					{#each visibilityOptions(container, relatedContainers) as option (option.value)}
						<label>
							<input
								type="radio"
								name="visibility"
								value={option.value}
								checked={container.payload.visibility === option.value}
								onchange={() => (container.payload.visibility = option.value)}
							/>
							<span class="badge badge--gray">
								<span class="truncated">{option.label}</span>
							</span>
						</label>
					{/each}
				</fieldset>
			{:else if openSubMenuTitle === $_('progress_measurement')}
				<fieldset class="listbox">
					{#each progressMeasurement.options as option (option)}
						<label>
							<input
								type="radio"
								name="measurement"
								value={option}
								checked={container.payload.measurement === option}
								onchange={() => {
									container.payload.measurement = option;
									onmeasurementchange?.();
								}}
							/>
							<span>{$_(`progress_measurement.${option}`)}</span>
						</label>
					{/each}
				</fieldset>
			{/if}
		{/snippet}
	</CascadingMenu>

	<ConfirmDeleteDialog
		bind:dialog={confirmDeleteDialog}
		{container}
		handleSubmit={handleDelete}
		{relatedContainers}
	/>
{/if}
