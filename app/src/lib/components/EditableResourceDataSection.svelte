<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		hasValidResource,
		isResourceV2Container,
		type AnyContainer,
		type ResourceDataContainer,
		type ResourceV2Container
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import { tick } from 'svelte';
	import saveContainer from '$lib/client/saveContainer';
	import { invalidate } from '$app/navigation';
	import Close from '~icons/knotdots/close';

	interface Props {
		container: ResourceDataContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let currentResource: ResourceV2Container | undefined = $derived(
		relatedContainers.find(
			(resource): resource is ResourceV2Container =>
				isResourceV2Container(resource) && resource.guid === container.payload.resource
		)
	);

	let tableContainer = $state<HTMLDivElement | null>(null);
	let selectResourceDialog = $state<HTMLDialogElement | null>(null);

	let selectableResources = $derived(relatedContainers.filter(isResourceV2Container));

	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleSave(target: ResourceDataContainer) {
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		saveTimer = setTimeout(async () => {
			const response = await saveContainer(target);

			if (response.ok) {
				const updatedTarget = await response.json();
				target.revision = updatedTarget.revision;
				await invalidate('containers');
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}, 2000);
	}

	function addEntryLeft() {
		const currentYear = new Date().getFullYear();
		const entries = container.payload.entries;
		const year = entries.length === 0 ? currentYear : (entries[0]?.year ?? currentYear) - 1;

		container.payload.entries = [{ year, amount: 0 }, ...entries];

		scheduleSave(container);
	}

	async function addEntryRight() {
		// Add data entry
		const currentYear = new Date().getFullYear();
		const entries = container.payload.entries;
		const year =
			entries.length === 0 ? currentYear : (entries[entries.length - 1]?.year ?? currentYear) + 1;

		container.payload.entries = [...entries, { year, amount: 0 }];

		scheduleSave(container);

		// Scroll to the end of the table to show the new entry
		await tick();

		if (tableContainer) {
			tableContainer.scrollTo({ left: tableContainer.scrollWidth, behavior: 'smooth' });
		}
	}

	function removeEntry(index: number) {
		container.payload.entries = container.payload.entries.filter((_, i) => i !== index);

		scheduleSave(container);
	}

	function openSelectResourceDialog() {
		if (selectResourceDialog) {
			selectResourceDialog.showModal();
		}
	}

	function handleSelectResource(resourceGuid: string) {
		container.payload.resource = resourceGuid;
		if (selectResourceDialog) {
			selectResourceDialog.close();
		}

		scheduleSave(container);
	}
</script>

<div class="resource-data">
	<header class="resource-data__header">
		<div class="resource-data__heading">
			<h2 class="resource-data__title">
				<span class="resource-data__title-main">{container.payload.title}</span>
				{#if currentResource}
					<span class="resource-data__title-in">in</span>
					<span class="resource-data__title-unit">
						{$_(currentResource.payload.resourceUnit)}
					</span>
				{/if}
			</h2>
		</div>

		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
				</li>
			</ul>
		{/if}
	</header>

	{#if !hasValidResource(container)}
		<p class="notification notification--warning">
			{$_('indicator.table.no_resource_warning')}
		</p>

		{#if editable && $ability.can('update', container) && selectableResources.length > 0}
			<button
				class="button-xs button-primary resource-data__select-resource-button"
				onclick={openSelectResourceDialog}
				type="button"
			>
				{$_('indicator.table.select_resource')}
			</button>
		{/if}
	{:else}
		<div class="resource-data__table-wrapper" bind:this={tableContainer}>
			<table class="resource-data__table">
				<thead>
					<tr>
						<th scope="col" class="resource-data__column-label">
							{$_('unit.year')}
						</th>

						{#if editable && $ability.can('update', container)}
							<th scope="col" class="resource-data__header-actions">
								<button
									aria-label={$_('add_item')}
									class="resource-data__icon-button"
									onclick={addEntryLeft}
									type="button"
								>
									<Plus />
								</button>
							</th>
						{/if}

						{#each container.payload.entries as entry}
							<th scope="col" class="resource-data__year">
								{#if editable && $ability.can('update', container)}
									<input
										class="resource-data__year-input"
										bind:value={entry.year}
										type="text"
										inputmode="numeric"
										pattern="[0-9]*"
									/>
								{:else}
									{entry.year}
								{/if}
							</th>
						{/each}

						{#if editable && $ability.can('update', container)}
							<th scope="col" class="resource-data__header-actions">
								<button
									aria-label={$_('add_item')}
									class="resource-data__icon-button"
									onclick={addEntryRight}
									type="button"
								>
									<Plus />
								</button>
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if container.payload.entries.length === 0}
						<tr>
							<td
								class="resource-data__empty"
								colspan={1 + (editable && $ability.can('update', container) ? 1 : 0)}
							>
								{$_('empty')}
							</td>
						</tr>
					{:else}
						<tr>
							<th scope="row" class="resource-data__row-label">
								{container.payload.title}
							</th>

							{#if editable && $ability.can('update', container)}
								<td class="resource-data__value resource-data__value--placeholder"></td>
							{/if}

							{#each container.payload.entries as entry, index}
								<td class="resource-data__value">
									{#if editable && $ability.can('update', container)}
										<input
											bind:value={entry.amount}
											class="resource-data__value-input"
											inputmode="decimal"
											pattern="[0-9]*([.,][0-9]+)?"
											type="text"
										/>
									{:else}
										{entry.amount}
									{/if}
								</td>
							{/each}

							{#if editable && $ability.can('update', container)}
								<td class="resource-data__value resource-data__value--placeholder"></td>
							{/if}
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if editable && selectableResources.length > 0}
	<dialog bind:this={selectResourceDialog} class="resource-data__dialog">
		<form method="dialog" class="resource-data__dialog-form">
			<p class="resource-data__dialog-header">
				<span>{$_('indicator.table.select_resource')}</span>
				<button class="action-button" formnovalidate type="submit">
					<Close />
					<span class="is-visually-hidden">{$_('cancel')}</span>
				</button>
			</p>

			<ul class="resource-data__dialog-list">
				{#each selectableResources as resource}
					<li>
						<button
							class="button button-xs"
							onclick={() => handleSelectResource(resource.guid)}
							type="button"
						>
							{resource.payload.title}
						</button>
					</li>
				{/each}
			</ul>
		</form>
	</dialog>
{/if}

<style>
	.resource-data {
		background-color: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.75rem 1rem 1rem;
	}

	.resource-data__header {
		align-items: flex-start;
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.resource-data__heading {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.resource-data__title {
		color: var(--color-gray-900);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.25;
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.resource-data__title-main {
		color: var(--color-gray-900);
	}

	.resource-data__title-in {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 400;
	}

	.resource-data__title-unit {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 400;
	}

	.resource-data__table-wrapper {
		display: block;
		overflow: auto;
		white-space: nowrap;
		border-radius: 8px;
	}

	.resource-data__table {
		border-collapse: collapse;
		width: 100%;
	}

	.resource-data__table thead th {
		background-color: var(--color-gray-100);
		border-bottom: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		font-weight: 400;
		font-size: 0.875rem;
		padding: 0.5rem 0.75rem;
		text-align: right;
		white-space: nowrap;
	}

	.resource-data__table thead th.resource-data__column-label {
		text-align: left;
	}

	.resource-data__year {
		min-width: 3.5rem;
	}

	.resource-data__year-input {
		background: transparent;
		border: none;
		color: var(--color-gray-700);
		font: inherit;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	.resource-data__year-input:focus-visible {
		outline: 2px solid var(--focus-color);
		outline-offset: 2px;
	}

	.resource-data__header-actions {
		text-align: center;
		width: 3rem;
	}

	.resource-data__icon-button {
		--button-active-background: transparent;
		--button-hover-background: var(--color-gray-200);

		align-items: center;
		background: transparent;
		border: none;
		border-radius: 9999px;
		color: var(--color-gray-700);
		cursor: pointer;
		display: inline-flex;
		height: 1.5rem;
		justify-content: center;
		padding: 0.125rem;
		width: 1.5rem;
	}

	.resource-data__icon-button :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.resource-data__table tbody th,
	.resource-data__table tbody td {
		border-bottom: 1px solid var(--color-gray-200);
		padding: 0.75rem 0.75rem;
	}

	.resource-data__row-label {
		color: var(--color-gray-900);
		font-weight: 500;
		text-align: left;
		white-space: nowrap;
	}

	.resource-data__value {
		color: var(--color-gray-700);
		text-align: right;
	}

	.resource-data__value-input {
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	.resource-data__value-input:focus-visible {
		outline: 2px solid var(--focus-color);
		outline-offset: 2px;
	}

	.resource-data__value--placeholder {
		border-bottom-color: transparent;
	}

	.resource-data__empty {
		color: var(--color-gray-500);
		padding: 0.75rem 0.75rem;
		text-align: left;
	}

	.resource-data__select-resource-button {
		margin-top: 0.5rem;
	}

	.resource-data__dialog {
		color: var(--color-gray-500);
		width: calc(min(32rem, 100vw));
	}

	.resource-data__dialog-form {
		min-width: 16rem;
	}

	.resource-data__dialog-header {
		align-items: center;
		background-color: white;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.resource-data__dialog-list {
		list-style: none;
		margin: 0;
		max-height: 20rem;
		overflow: auto;
		padding: 0 1.25rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
