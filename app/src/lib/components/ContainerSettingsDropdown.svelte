<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import Eye from '~icons/flowbite/eye-outline';
	import DoubleWidth from '~icons/flowbite/merge-or-split-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import Background from '~icons/knotdots/background';
	import deleteContainer from '$lib/client/deleteContainer';
	import CascadingMenu from '$lib/components/CascadingMenu.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import {
		type AnyPayload,
		backgroundColor,
		type Container,
		isContainerWithColor,
		isTeaserLikeContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import visibilityOptions from '$lib/visibilityOptions.svelte';
	import { backgroundColors } from '$lib/theme/models';

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

{#if $ability.can('update', container, 'payload.visibility') || ($ability.can('update', container) && isContainerWithColor(container)) || ($ability.can('update', container) && isTeaserLikeContainer(container)) || $ability.can('delete', container)}
	<CascadingMenu title={$_('container_settings_dropdown.title')}>
		{#snippet children(
			openSubMenuTitle: string,
			openSubMenu: (title: string) => void,
			closeMenu: () => void
		)}
			{#if openSubMenuTitle == ''}
				{#if isContainerWithColor(container) && $ability.can('update', container)}
					<button
						class="cascading-menu-item"
						onclick={() => openSubMenu($_('container_settings_dropdown.highlight.title'))}
						type="button"
					>
						<Background />
						<span>
							<strong>{$_('container_settings_dropdown.highlight.title')}</strong>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if isTeaserLikeContainer(container) && $ability.can('update', container)}
					<label class="cascading-menu-item">
						<DoubleWidth />
						<span>
							<strong>{$_('container_settings_dropdown.double_width.title')}</strong>
						</span>
						<input
							bind:checked={container.payload.doubleWidth}
							class="toggle"
							name="sectionLayout"
							type="checkbox"
						/>
					</label>
				{/if}

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

				{#if $ability.can('delete', container)}
					<div class="cascading-menu-divider" role="presentation"></div>
					<button
						class="cascading-menu-item system-danger"
						onclick={() => {
							closeMenu();
							dialog.showModal();
						}}
						type="button"
					>
						<TrashBin />
						<span>
							<strong>{$_('delete')}</strong>
						</span>
					</button>
				{/if}
			{:else if openSubMenuTitle == $_('container_settings_dropdown.highlight.title') && isContainerWithColor(container)}
				<fieldset class="listbox">
					{#each backgroundColor.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
						<label>
							<input
								bind:group={container.payload.color}
								name="color"
								type="radio"
								value={option.value}
							/>
							<span class="stage stage--color stage--{backgroundColors.get(option.value)}">
								&nbsp;
							</span>
							{option.label}
						</label>
					{/each}
				</fieldset>
			{:else if openSubMenuTitle == $_('container_settings_dropdown.visibility.title')}
				<fieldset class="listbox">
					{#each visibilityOptions(container, relatedContainers) as option (option.value)}
						<label>
							<input
								type="radio"
								name="visibility"
								value={option.value}
								bind:group={container.payload.visibility}
							/>
							<span class="badge badge--gray">
								<span class="truncated">
									{option.label}
								</span>
							</span>
						</label>
					{/each}
				</fieldset>
			{/if}
		{/snippet}
	</CascadingMenu>
{/if}

{#if $ability.can('delete', container)}
	<ConfirmDeleteDialog
		bind:dialog
		{container}
		handleSubmit={() => handleDelete(container)}
		{relatedContainers}
	/>
{/if}

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;

		margin-left: auto;
	}
</style>
