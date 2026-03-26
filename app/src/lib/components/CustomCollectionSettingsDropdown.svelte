<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronLeft from '~icons/flowbite/chevron-left-outline';
	import Eye from '~icons/flowbite/eye-outline';
	import Sort from '~icons/flowbite/sort-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ArrowRightBox from '~icons/knotdots/arrow-right-box';
	import CarouselIcon from '~icons/knotdots/carousel';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import Close from '~icons/knotdots/close';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import Grid from '~icons/knotdots/grid';
	import Search from '~icons/knotdots/search';
	import deleteContainer from '$lib/client/deleteContainer';
	import saveContainer from '$lib/client/saveContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { type AnyContainer, type CustomCollectionContainer, visibility } from '$lib/models';
	import { ability } from '$lib/stores';

	type SettingsSubview = 'main' | 'view' | 'visibility' | 'interactions';

	interface Props {
		container: CustomCollectionContainer;
		onAddItems: () => void;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		onAddItems,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let settingsSubview = $state<SettingsSubview>('main');

	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

	let popover = createPopover({ label: $_('custom_collection.settings.title') });

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy: 'fixed'
	});

	const popperOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 8] } }] };

	let interactionsSummary = $derived.by(() => {
		const interactions: string[] = [];
		if (container.payload.allowSearch) {
			interactions.push($_('search'));
		}
		if (container.payload.allowSort) {
			interactions.push($_('sort'));
		}
		return interactions.length > 0 ? interactions.join(', ') : $_('empty');
	});

	async function updateSettings(payloadPatch: Partial<CustomCollectionContainer['payload']>) {
		const response = await saveContainer({
			...container,
			payload: {
				...container.payload,
				...payloadPatch
			}
		});

		if (response.ok) {
			const updatedContainer = await response.json();
			container.payload = updatedContainer.payload;
			container.revision = updatedContainer.revision;
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	async function setVisibilityOption(value: (typeof visibility.options)[number]) {
		if (container.payload.visibility === value) return;
		await updateSettings({ visibility: value });
	}

	async function toggleAllowSearch() {
		await updateSettings({ allowSearch: !container.payload.allowSearch });
	}

	async function toggleAllowSort() {
		await updateSettings({ allowSort: !container.payload.allowSort });
	}

	function openSubview(view: SettingsSubview) {
		settingsSubview = view;
	}

	function closePopover() {
		settingsSubview = 'main';
		popover.close();
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

		confirmDeleteDialog.close();
	}

	$effect(() => {
		if (!$popover.expanded) {
			settingsSubview = 'main';
		}
	});
</script>

<div class="dropdown custom-settings" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<Ellipsis />
		<span class="is-visually-hidden">{$_('custom_collection.settings.title')}</span>
	</button>

	{#if $popover.expanded}
		<fieldset
			class="dropdown-panel custom-settings-panel"
			use:popperContent={popperOpts}
			use:popover.panel
		>
			<div class="custom-settings-header">
				{#if settingsSubview !== 'main'}
					<button class="action-button" onclick={backToMain} type="button">
						<ChevronLeft />
						<span class="is-visually-hidden">{$_('back')}</span>
					</button>
				{/if}
				<p>
					{#if settingsSubview === 'main'}
						{$_('container_settings_dropdown.title')}
					{:else if settingsSubview === 'view'}
						{$_('custom_collection.settings.view')}
					{:else if settingsSubview === 'visibility'}
						{$_('container_settings_dropdown.visibility.title')}
					{:else}
						{$_('custom_collection.settings.interactions')}
					{/if}
				</p>
				<button class="action-button" onclick={closePopover} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</div>

			{#if settingsSubview === 'main'}
				<button class="custom-settings-item" onclick={() => openSubview('view')} type="button">
					<CarouselIcon />
					<span>
						<strong>{$_('custom_collection.settings.view')}</strong>
						<small>{$_(`list_type.${container.payload.listType}`)}</small>
					</span>
					<ChevronRight />
				</button>

				{#if $ability.can('update', container, 'visibility')}
					<button
						class="custom-settings-item"
						onclick={() => openSubview('visibility')}
						type="button"
					>
						<Eye />
						<span>
							<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
							<small>{$_(`visibility.${container.payload.visibility}`)}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				<button
					class="custom-settings-item"
					onclick={() => openSubview('interactions')}
					type="button"
				>
					<ArrowRightBox />
					<span>
						<strong>{$_('custom_collection.settings.interactions')}</strong>
						<small>{interactionsSummary}</small>
					</span>
					<ChevronRight />
				</button>

				<div class="custom-settings-divider" role="presentation"></div>
				<div class="custom-settings-section-title">
					{$_('custom_collection.settings.objects_title')}
				</div>
				<button
					class="custom-settings-embed"
					onclick={() => {
						closePopover();
						onAddItems();
					}}
					type="button"
				>
					{$_('custom_collection.settings.embed_objects')}
				</button>

				<div class="custom-settings-divider" role="presentation"></div>

				{#if $ability.can('delete', container)}
					<button
						class="custom-settings-item custom-settings-item--danger"
						onclick={() => {
							closePopover();
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
			{:else if settingsSubview === 'view'}
				<label
					class="custom-settings-choice"
					class:is-selected={container.payload.listType === 'wall'}
				>
					<input
						type="radio"
						name="listType"
						value="wall"
						checked={container.payload.listType === 'wall'}
						onchange={() => updateSettings({ listType: 'wall' })}
					/>
					<Grid />
					<span>{$_('list_type.wall')}</span>
				</label>
				<label
					class="custom-settings-choice"
					class:is-selected={container.payload.listType === 'carousel'}
				>
					<input
						type="radio"
						name="listType"
						value="carousel"
						checked={container.payload.listType === 'carousel'}
						onchange={() => updateSettings({ listType: 'carousel' })}
					/>
					<Grid />
					<span>{$_('list_type.carousel')}</span>
				</label>
			{:else if settingsSubview === 'visibility'}
				{#each visibility.options as option (option)}
					<label
						class="custom-settings-visibility"
						class:is-selected={container.payload.visibility === option}
					>
						<input
							type="radio"
							name="visibility"
							value={option}
							checked={container.payload.visibility === option}
							onchange={() => setVisibilityOption(option)}
						/>
						<span class="custom-settings-badge">{$_(`visibility.${option}`)}</span>
					</label>
				{/each}
			{:else}
				<label class="custom-settings-toggle">
					<input
						type="checkbox"
						checked={container.payload.allowSearch}
						onchange={toggleAllowSearch}
					/>
					<Search />
					<span>{$_('search')}</span>
				</label>
				<label class="custom-settings-toggle">
					<input type="checkbox" checked={container.payload.allowSort} onchange={toggleAllowSort} />
					<Sort />
					<span>{$_('sort')}</span>
				</label>
			{/if}
		</fieldset>
	{/if}
</div>

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	{container}
	handleSubmit={handleDelete}
	{relatedContainers}
/>

<style>
	.custom-settings {
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-padding: 0.375rem;
		--dropdown-button-border-radius: 8px;
		--dropdown-button-icon-default-color: var(--color-gray-500);
		--dropdown-button-icon-expanded-color: var(--color-primary-700);
		--dropdown-button-chevron-display: none;
	}

	.custom-settings-panel {
		background-color: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 1rem;
		gap: 0;
		min-width: 17.5rem;
		padding: 0.5rem;
	}

	.custom-settings-header {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0 0.5rem 0.5rem;
	}

	.custom-settings-header p {
		color: var(--color-gray-700);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0;
	}

	.custom-settings-header .action-button {
		--button-active-background: transparent;
		--button-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0.25rem;
		--padding-y: 0.25rem;

		border: none;
		margin-left: -0.3rem;
	}

	.custom-settings-header .action-button > :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.custom-settings-item {
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

	.custom-settings-item:hover {
		background-color: var(--color-gray-100);
	}

	.custom-settings-item > :global(svg:first-child) {
		color: var(--color-primary-700);
		height: 1rem;
		max-width: none;
		width: 1rem;
	}

	.custom-settings-item > span {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.custom-settings-item strong {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
	}

	.custom-settings-item small {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.custom-settings-item > :global(svg:last-child) {
		color: var(--color-gray-400);
		height: 0.75rem;
		margin-left: auto;
		width: 0.75rem;
	}

	.custom-settings-choice,
	.custom-settings-visibility,
	.custom-settings-toggle {
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

	.custom-settings-choice:hover,
	.custom-settings-visibility:hover,
	.custom-settings-toggle:hover {
		background-color: var(--color-gray-100);
	}

	.custom-settings-choice > :global(svg),
	.custom-settings-toggle > :global(svg) {
		color: var(--color-primary-700);
		height: 1rem;
		width: 1rem;
	}

	.custom-settings-choice.is-selected,
	.custom-settings-visibility.is-selected {
		background-color: var(--color-gray-100);
	}

	.custom-settings-badge {
		background-color: var(--color-primary-100);
		border-radius: 999px;
		color: var(--color-primary-700);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
	}

	.custom-settings-divider {
		border-top: solid 1px var(--color-gray-200);
		margin: 0.375rem 0;
	}

	.custom-settings-section-title {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem 0.375rem;
	}

	.custom-settings-embed {
		--button-background: var(--color-white);
		--button-hover-background: var(--color-gray-100);
		--button-active-background: var(--color-gray-200);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		border: 1px solid var(--color-gray-200);
		color: var(--color-gray-900);
		font-weight: 500;
		justify-content: center;
		width: 100%;
	}

	.custom-settings-item--danger > :global(svg:first-child),
	.custom-settings-item--danger strong {
		color: var(--color-gray-700);
	}
</style>
