<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		isResourceV2Container,
		type AnyContainer,
		type ResourceDataContainer,
		type ResourceV2Container
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import { tick } from 'svelte';
	import saveContainer from '$lib/client/saveContainer';
	import { invalidate } from '$app/navigation';

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
		relatedContainers.find((resource): resource is ResourceV2Container =>
			isResourceV2Container(resource)
		)
	);

	let tableContainer = $state<HTMLDivElement | null>(null);

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
</script>

<div class="resource-data">
	<header class="resource-data__header">
		<div class="resource-data__heading">
			<h2 class="resource-data__title">
				<span class="resource-data__title-main">{$_(container.payload.resourceDataType)}</span>
				{#if currentResource}
					<span class="resource-data__title-in">{$_('preposition.in')}</span>
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

	<div class="resource-data__table-wrapper" bind:this={tableContainer}>
		<table class="resource-data__table">
			<thead>
				<tr>
					<th scope="col" class="resource-data__column-label">
						<div class="resource-data__column-label-inner">
							<span class="resource-data__column-label-text">{$_('year')}</span>

							{#if editable && $ability.can('update', container)}
								<button
									aria-label={$_('add_item')}
									class="resource-data__cell-action"
									onclick={addEntryLeft}
									type="button"
								>
									<Plus />
								</button>
							{/if}
						</div>
					</th>

					{#each container.payload.entries as entry (entry.year)}
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

					{#if editable && $ability.can('update', container) && container.payload.entries.length > 0}
						<th scope="col" class="resource-data__header-actions">
							<button
								aria-label={$_('add_item')}
								class="resource-data__cell-action"
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
							colspan={1 +
								(editable &&
								$ability.can('update', container) &&
								container.payload.entries.length > 0
									? 1
									: 0)}
						>
							{$_('empty')}
						</td>
					</tr>
				{:else}
					<tr>
						<th scope="row" class="resource-data__row-header">
							<span class="resource-data__row-badge">{$_('value')}</span>
						</th>

						{#each container.payload.entries as entry (entry.year)}
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
							<td class="resource-data__header-actions resource-data__value--placeholder"></td>
						{/if}
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>

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
		border: 1px solid var(--color-gray-200);
		border-radius: 4px;
	}

	.resource-data__table {
		border-collapse: collapse;
		min-width: 100%;
		width: max-content;
		table-layout: fixed;
	}

	.resource-data__table thead th,
	.resource-data__table tbody th,
	.resource-data__table tbody td {
		border: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.5;
		padding: 0.75rem 0.5rem;
		white-space: nowrap;
	}

	.resource-data__table thead th {
		background-color: var(--color-gray-100);
		height: 40px;
		padding: 0.5rem;
		text-align: right;
		vertical-align: middle;
	}

	.resource-data__column-label {
		text-align: left;
		width: 220px;
	}

	.resource-data__column-label-inner {
		align-items: center;
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
	}

	.resource-data__column-label-text {
		display: inline-block;
	}

	.resource-data__year {
		width: 56px;
	}

	.resource-data__year-input {
		background: transparent;
		border: none;
		box-sizing: border-box;
		color: var(--color-gray-700);
		font: inherit;
		min-width: 0;
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
		width: 56px;
	}

	.resource-data__cell-action {
		--button-active-background: transparent;
		--button-hover-background: var(--color-gray-200);

		align-items: center;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--color-gray-700);
		cursor: pointer;
		display: inline-flex;
		height: 24px;
		justify-content: center;
		padding: 6px;
		width: 24px;
	}

	.resource-data__cell-action:hover {
		background: var(--color-gray-200);
	}

	.resource-data__cell-action:focus-visible {
		outline: 2px solid var(--focus-color);
		outline-offset: 2px;
	}

	.resource-data__cell-action :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.resource-data__table tbody th,
	.resource-data__table tbody td {
		background-color: var(--color-white);
		min-height: 48px;
		padding: 0.75rem 0.5rem;
		vertical-align: middle;
	}

	.resource-data__row-header {
		text-align: left;
		width: 220px;
	}

	.resource-data__row-badge {
		align-items: center;
		display: inline-flex;
		font-weight: 400;
		line-height: 14px;
		overflow: hidden;
		padding: 6px 0;
		border-radius: 9999px;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}

	.resource-data__value {
		color: var(--color-gray-700);
		text-align: right;
	}

	.resource-data__value-input {
		background: transparent;
		border: none;
		box-sizing: border-box;
		color: inherit;
		font: inherit;
		min-width: 0;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	.resource-data__value-input:focus-visible {
		outline: 2px solid var(--focus-color);
		outline-offset: 2px;
	}

	.resource-data__value--placeholder {
		color: transparent;
	}

	.resource-data__empty {
		color: var(--color-gray-500);
		padding: 0.75rem 0.75rem;
		text-align: left;
	}
</style>
