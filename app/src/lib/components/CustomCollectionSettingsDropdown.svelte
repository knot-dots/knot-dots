<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Eye from '~icons/flowbite/eye-outline';
	import Sort from '~icons/flowbite/sort-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ArrowRightBox from '~icons/knotdots/arrow-right-box';
	import CarouselIcon from '~icons/knotdots/carousel';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import Grid from '~icons/knotdots/grid';
	import Search from '~icons/knotdots/search';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import MultilevelSettingsDropdown from '$lib/components/MultilevelSettingsDropdown.svelte';
	import { type AnyContainer, type CustomCollectionContainer, visibility } from '$lib/models';
	import { ability } from '$lib/stores';

	type SettingsSubview = 'main' | 'view' | 'visibility' | 'interactions';

	interface Props {
		container: CustomCollectionContainer;
		onAddItems: () => void;
		onAddTemplates: () => void;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		onAddItems,
		onAddTemplates,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let settingsSubview = $state<SettingsSubview>('main');

	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

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

		confirmDeleteDialog.close();
	}
</script>

<MultilevelSettingsDropdown
	isRoot={settingsSubview === 'main'}
	label={$_('custom_collection.settings.title')}
	handleBack={backToMain}
	handleClose={resetSettingsState}
	handleOpen={resetSettingsState}
	title={settingsSubview === 'main'
		? $_('container_settings_dropdown.title')
		: settingsSubview === 'view'
			? $_('custom_collection.settings.view')
			: settingsSubview === 'visibility'
				? $_('container_settings_dropdown.visibility.title')
				: $_('custom_collection.settings.interactions')}
>
	{#snippet children(closeDropdown)}
		{#if settingsSubview === 'main'}
			<button class="settings-item" onclick={() => openSubview('view')} type="button">
				{#if container.payload.listType === 'carousel'}
					<CarouselIcon />
				{:else}
					<Grid />
				{/if}
				<span>
					<strong>{$_('custom_collection.settings.view')}</strong>
					<small>{$_(`list_type.${container.payload.listType}`)}</small>
				</span>
				<ChevronRight />
			</button>

			{#if $ability.can('update', container, 'visibility')}
				<button class="settings-item" onclick={() => openSubview('visibility')} type="button">
					<Eye />
					<span>
						<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
						<small>{$_(`visibility.${container.payload.visibility}`)}</small>
					</span>
					<ChevronRight />
				</button>
			{/if}

			<button class="settings-item" onclick={() => openSubview('interactions')} type="button">
				<ArrowRightBox />
				<span>
					<strong>{$_('custom_collection.settings.interactions')}</strong>
					<small>{interactionsSummary}</small>
				</span>
				<ChevronRight />
			</button>

			<div class="settings-divider" role="presentation"></div>
			<p class="dropdown-panel-group-title">
				{$_('custom_collection.settings.objects_title')}
			</p>
			<button
				class="settings-button"
				onclick={() => {
					closeDropdown();
					onAddItems();
				}}
				type="button"
			>
				{$_('custom_collection.settings.embed_objects')}
			</button>

			<div class="settings-divider" role="presentation"></div>

			<p class="dropdown-panel-group-title">
				{$_('custom_collection.settings.create_objects_title')}
			</p>

			<button
				class="settings-button"
				onclick={() => {
					closeDropdown();
					onAddTemplates();
				}}
				type="button"
			>
				{$_('template_picker_title')}
			</button>

			<div class="settings-divider" role="presentation"></div>

			{#if $ability.can('delete', container)}
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
		{:else if settingsSubview === 'view'}
			<label class="settings-choice" class:is-selected={container.payload.listType === 'wall'}>
				<input
					type="radio"
					name="listType"
					value="wall"
					checked={container.payload.listType === 'wall'}
					onchange={() => (container.payload.listType = 'wall')}
				/>
				<Grid />
				<span>{$_('list_type.wall')}</span>
			</label>
			<label class="settings-choice" class:is-selected={container.payload.listType === 'carousel'}>
				<input
					type="radio"
					name="listType"
					value="carousel"
					checked={container.payload.listType === 'carousel'}
					onchange={() => (container.payload.listType = 'carousel')}
				/>
				<CarouselIcon />
				<span>{$_('list_type.carousel')}</span>
			</label>
		{:else if settingsSubview === 'visibility'}
			{#each visibility.options as option (option)}
				<label
					class="settings-visibility"
					class:is-selected={container.payload.visibility === option}
				>
					<input
						type="radio"
						name="visibility"
						value={option}
						checked={container.payload.visibility === option}
						onchange={() => (container.payload.visibility = option)}
					/>
					<span class="badge badge--gray">{$_(`visibility.${option}`)}</span>
				</label>
			{/each}
		{:else}
			<label class="settings-toggle">
				<input
					type="checkbox"
					checked={container.payload.allowSearch}
					onchange={() => (container.payload.allowSearch = !container.payload.allowSearch)}
				/>
				<Search />
				<span>{$_('search')}</span>
			</label>
			<label class="settings-toggle">
				<input
					type="checkbox"
					checked={container.payload.allowSort}
					onchange={() => (container.payload.allowSort = !container.payload.allowSort)}
				/>
				<Sort />
				<span>{$_('sort')}</span>
			</label>
		{/if}
	{/snippet}
</MultilevelSettingsDropdown>

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	{container}
	handleSubmit={handleDelete}
	{relatedContainers}
/>

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
	.settings-visibility,
	.settings-toggle {
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

	.settings-visibility:hover,
	.settings-toggle:hover {
		background-color: var(--color-gray-100);
	}

	.settings-choice:hover,
	.settings-choice.is-selected {
		background-color: var(--color-primary-100);
	}

	.settings-choice > :global(svg),
	.settings-toggle > :global(svg) {
		color: var(--color-gray-700);
		height: 1rem;
		width: 1rem;
	}

	.settings-choice:hover > :global(svg),
	.settings-choice.is-selected > :global(svg) {
		color: var(--color-primary-700);
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

	.dropdown-panel-group-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem;
	}

	.settings-button {
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

	.settings-item--danger > :global(svg:first-child),
	.settings-item--danger strong {
		color: var(--color-gray-700);
	}
</style>
