<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Eye from '~icons/flowbite/eye-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ChevronRight from '~icons/knotdots/chevron-right';
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

	type SettingsSubview = 'main' | 'visibility' | 'measurement';

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

	let settingsSubview = $state<SettingsSubview>('main');

	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

	let visibilityLabel = $derived(
		visibilityOptions(container, relatedContainers).find(
			({ value }) => value === container.payload.visibility
		)?.label ?? $_(`visibility.${container.payload.visibility}`)
	);

	function openSubview(view: SettingsSubview) {
		settingsSubview = view;
	}

	function resetSettingsState() {
		settingsSubview = 'main';
	}

	function backToMain() {
		settingsSubview = 'main';
	}

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
	<CascadingMenu
		isRoot={settingsSubview === 'main'}
		label={$_('settings')}
		handleBack={backToMain}
		handleClose={resetSettingsState}
		handleOpen={resetSettingsState}
		title={settingsSubview === 'main'
			? $_('container_settings_dropdown.title')
			: settingsSubview === 'visibility'
				? $_('container_settings_dropdown.visibility.title')
				: $_('progress_measurement')}
	>
		{#snippet children(closeDropdown)}
			{#if settingsSubview === 'main'}
				{#if $ability.can('update', container, 'payload.visibility')}
					<button class="settings-item" onclick={() => openSubview('visibility')} type="button">
						<Eye />
						<span>
							<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
							<small>{visibilityLabel}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if createFeatureDecisions(page.data.features).useComputedProgress() && $ability.can('update', container)}
					<button class="settings-item" onclick={() => openSubview('measurement')} type="button">
						<Progress />
						<span>
							<strong>{$_('progress_measurement')}</strong>
							<small>{$_(`progress_measurement.${container.payload.measurement}`)}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if $ability.can('delete', container)}
					<div class="settings-divider" role="presentation"></div>
					<button
						class="settings-item settings-item--danger"
						onclick={() => {
							closeDropdown();
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
			{:else if settingsSubview === 'visibility'}
				{#each visibilityOptions(container, relatedContainers) as option (option.value)}
					<label
						class="settings-visibility"
						class:is-selected={container.payload.visibility === option.value}
					>
						<input
							type="radio"
							name="visibility"
							value={option.value}
							checked={container.payload.visibility === option.value}
							onchange={() => (container.payload.visibility = option.value)}
						/>
						<span class="badge badge--gray">{option.label}</span>
					</label>
				{/each}
			{:else}
				{#each progressMeasurement.options as option (option)}
					<label
						class="settings-choice"
						class:is-selected={container.payload.measurement === option}
					>
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

<style>
	.settings-item {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--color-gray-700);
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.settings-item:hover {
		background-color: var(--color-gray-100);
	}

	.settings-item > :global(svg:first-child) {
		color: var(--color-gray-700);
		height: 1rem;
		max-width: none;
		width: 1rem;
	}

	.settings-item > span {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.settings-item strong {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
	}

	.settings-item small {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.settings-item > :global(svg:last-child) {
		color: var(--color-gray-400);
		height: 0.75rem;
		margin-left: auto;
		width: 0.75rem;
	}

	.settings-choice,
	.settings-visibility {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.settings-visibility:hover {
		background-color: var(--color-gray-100);
	}

	.settings-choice:hover,
	.settings-choice.is-selected {
		background-color: var(--color-primary-100);
	}

	.settings-choice:hover > span,
	.settings-choice.is-selected > span {
		color: var(--color-primary-700);
	}

	.settings-visibility.is-selected {
		background-color: var(--color-gray-100);
	}

	.settings-divider {
		border-top: solid 1px var(--color-gray-200);
		margin: 0.375rem 0;
	}

	.settings-item--danger > :global(svg:first-child),
	.settings-item--danger strong {
		color: var(--color-gray-700);
	}
</style>
