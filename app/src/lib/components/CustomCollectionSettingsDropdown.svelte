<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import Eye from '~icons/flowbite/eye-outline';
	import Sort from '~icons/flowbite/sort-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ArrowRightBox from '~icons/knotdots/arrow-right-box';
	import CarouselIcon from '~icons/knotdots/carousel';
	import Grid from '~icons/knotdots/grid';
	import Search from '~icons/knotdots/search';
	import Text from '~icons/knotdots/text';
	import deleteContainer from '$lib/client/deleteContainer';
	import CascadingMenu from '$lib/components/CascadingMenu.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import {
		type AnyPayload,
		type Container,
		type CustomCollectionPayload
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: Container<CustomCollectionPayload>;
		onAddItems: () => void;
		onAddTemplates: () => void;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		onAddItems,
		onAddTemplates,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

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

<CascadingMenu title={$_('container_settings_dropdown.title')}>
	{#snippet children(openSubMenuTitle, openSubMenu, closeMenu)}
		{#if openSubMenuTitle === ''}
			<label class="button cascading-menu-item">
				<Text />
				<span>
					{$_('custom_collection.settings.description')}
				</span>
				<input
					class="toggle"
					name="descriptionToggle"
					type="checkbox"
					bind:checked={container.payload.showDescription}
				/>
			</label>

			<button
				class="cascading-menu-item"
				onclick={() => openSubMenu($_('custom_collection.settings.view'))}
				type="button"
			>
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

			<div class="cascading-menu-divider" role="presentation"></div>
			{#if $ability.can('update', container, 'payload.visibility')}
				<button
					class="cascading-menu-item"
					onclick={() => openSubMenu($_('container_settings_dropdown.visibility.title'))}
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
				class="cascading-menu-item"
				onclick={() => openSubMenu($_('custom_collection.settings.interactions'))}
				type="button"
			>
				<ArrowRightBox />
				<span>
					<strong>{$_('custom_collection.settings.interactions')}</strong>
					<small>{interactionsSummary}</small>
				</span>
				<ChevronRight />
			</button>

			<div class="cascading-menu-divider" role="presentation"></div>
			<p class="dropdown-panel-group-title">
				{$_('custom_collection.settings.objects_title')}
			</p>
			<button
				class="cascading-menu-item"
				onclick={() => {
					closeMenu();
					onAddItems();
				}}
				type="button"
			>
				{$_('custom_collection.settings.embed_objects')}
			</button>

			<div class="cascading-menu-divider" role="presentation"></div>

			<p class="dropdown-panel-group-title">
				{$_('custom_collection.settings.create_objects_title')}
			</p>

			<button
				class="cascading-menu-item"
				onclick={() => {
					closeMenu();
					onAddTemplates();
				}}
				type="button"
			>
				{$_('template_picker_title')}
			</button>

			<div class="cascading-menu-divider" role="presentation"></div>

			{#if $ability.can('delete', container)}
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
		{:else if openSubMenuTitle === $_('custom_collection.settings.view')}
			<fieldset class="listbox">
				<label>
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
				<label>
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
			</fieldset>
		{:else if openSubMenuTitle === $_('container_settings_dropdown.visibility.title')}
			<fieldset class="listbox">
				{#each visibilityOptions(container, relatedContainers) as option (option.value)}
					<label>
						<input
							type="radio"
							name="visibility"
							value={option}
							checked={container.payload.visibility === option.value}
							onchange={() => (container.payload.visibility = option.value)}
						/>
						<span class="badge badge--gray">
							<span class="truncated">
								{$_(option.label)}
							</span>
						</span>
					</label>
				{/each}
			</fieldset>
		{:else if openSubMenuTitle === $_('custom_collection.settings.interactions')}
			<label>
				<input
					type="checkbox"
					checked={container.payload.allowSearch}
					onchange={() => (container.payload.allowSearch = !container.payload.allowSearch)}
				/>
				<Search />
				<span>{$_('search')}</span>
			</label>
			<label>
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
</CascadingMenu>

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	{container}
	handleSubmit={handleDelete}
	{relatedContainers}
/>

<style>
	label > :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.dropdown-panel-group-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem;
	}

	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
