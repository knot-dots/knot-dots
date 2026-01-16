<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type ResourceDataCollectionContainer,
		isResourceDataContainer,
		type ResourceDataContainer,
		containerOfType,
		payloadTypes,
		predicates,
		type NewContainer
	} from '$lib/models';
	import saveContainer from '$lib/client/saveContainer';
	import { ability } from '$lib/stores';
	import { tick } from 'svelte';
	import { invalidate } from '$app/navigation';

	interface Props {
		container: ResourceDataCollectionContainer;
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

	let tableContainer: HTMLDivElement;

	// All resource-data containers connected to this resource
	let series = $derived(
		relatedContainers.filter(
			(c): c is ResourceDataContainer =>
				isResourceDataContainer(c) && c.payload.resource === parentContainer.guid
		)
	);

	// Sorted list of all years across all series
	let years = $state([]) as number[];

	$effect(() => {
		const yearSet = new Set<number>();
		for (const s of series) {
			for (const entry of s.payload.entries) {
				yearSet.add(entry.year);
			}
		}
		if (yearSet.size === 0) {
			yearSet.add(new Date().getFullYear());
		}
		years = Array.from(yearSet).sort((a, b) => a - b);
	});

	const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

	function scheduleSave(target: ResourceDataContainer) {
		const existing = saveTimers.get(target.guid);
		if (existing) {
			clearTimeout(existing);
		}

		const timer = setTimeout(async () => {
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

		saveTimers.set(target.guid, timer);
	}

	function addEntryLeft() {
		const currentYear = new Date().getFullYear();
		const firstYear = years[0] ?? currentYear;
		const year = firstYear - 1;

		for (const s of series) {
			const hasYear = s.payload.entries.some((e) => e.year === year);
			if (!hasYear) {
				s.payload.entries = [{ year, amount: 0 }, ...s.payload.entries];
				scheduleSave(s);
			}
		}
	}

	async function addEntryRight() {
		const currentYear = new Date().getFullYear();
		const lastYear = years[years.length - 1] ?? currentYear;
		const year = lastYear + 1;

		for (const s of series) {
			const hasYear = s.payload.entries.some((e) => e.year === year);
			if (!hasYear) {
				s.payload.entries = [...s.payload.entries, { year, amount: 0 }];
				scheduleSave(s);
			}
		}

		// Scroll to the end of the table to show the new entry
		await tick();

		if (tableContainer) {
			tableContainer.scrollTo({ left: tableContainer.scrollWidth, behavior: 'smooth' });
		}
	}

	function updateYear(oldYear: number, newYear: number) {
		if (!Number.isFinite(newYear) || newYear <= 0) {
			return;
		}

		for (const s of series) {
			const entry = s.payload.entries.find((e) => e.year === oldYear);
			if (entry) {
				entry.year = newYear;
				scheduleSave(s);
			}
		}
	}

	function updateAmount(s: ResourceDataContainer, year: number, value: string) {
		const numeric = value === '' ? 0 : Number(value.replace(',', '.'));
		let entry = s.payload.entries.find((e) => e.year === year);
		if (!entry) {
			entry = { year, amount: numeric };
			s.payload.entries = [...s.payload.entries, entry];
		} else {
			entry.amount = numeric;
		}
		scheduleSave(s);
	}

	function handleYearChange(oldYear: number) {
		return (event: Event) => {
			const input = event.currentTarget as HTMLInputElement;
			updateYear(oldYear, Number(input.value));
		};
	}

	function handleAmountInput(s: ResourceDataContainer, year: number) {
		return (event: Event) => {
			event.stopPropagation();
			const input = event.currentTarget as HTMLInputElement;
			updateAmount(s, year, input.value);
		};
	}

	const resourceDataTypesInOrder = [
		payloadTypes.enum.resource_data_historical_expenses,
		payloadTypes.enum.resource_data_expected_expenses,
		payloadTypes.enum.resource_data_historical_income,
		payloadTypes.enum.resource_data_expected_income
	];

	async function addSeries() {
		const existingTypes = new Set(series.map((s) => s.payload.type));
		const nextType = resourceDataTypesInOrder.find((t) => !existingTypes.has(t));

		if (!nextType) {
			return;
		}

		const newContainer = containerOfType(
			nextType,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer & ResourceDataContainer;

		// Link the series to the parent resource so it can be reloaded
		newContainer.payload.resource = parentContainer.guid;

		const response = await saveContainer(newContainer);
		if (!response.ok) {
			return;
		}

		const created = (await response.json()) as ResourceDataContainer;
		relatedContainers = [...relatedContainers, created];
	}
</script>

<div class="resource-data">
	<header class="resource-data__header">
		<div class="resource-data__heading">
			<p class="resource-data__edit-label">{$_('indicator.table.edit')}</p>
			<h2 class="resource-data__title">{container.payload.title}</h2>
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
						{$_('resource_data')}
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

					{#each years as year}
						<th scope="col" class="resource-data__year">
							{#if editable && $ability.can('update', container)}
								<input
									class="resource-data__year-input"
									value={year}
									type="text"
									inputmode="numeric"
									pattern="[0-9]*"
									onchange={handleYearChange(year)}
								/>
							{:else}
								{year}
							{/if}
						</th>
					{/each}

					{#if editable && $ability.can('update', container) && years.length > 0}
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
				{#if series.length === 0}
					<tr>
						<td
							class="resource-data__empty"
							colspan={1 + (editable && $ability.can('update', container) ? 1 : 0)}
						>
							{$_('empty')}
						</td>
					</tr>
				{:else}
					{#each series as s}
						<tr>
							<th scope="row" class="resource-data__row-label">
								{s.payload.title}
							</th>

							{#if editable && $ability.can('update', container)}
								<td class="resource-data__value resource-data__value--placeholder"></td>
							{/if}

							{#each years as year}
								{@const entry = s.payload.entries.find((e) => e.year === year)}
								<td class="resource-data__value">
									{#if editable && $ability.can('update', container)}
										<input
											class="resource-data__value-input"
											inputmode="decimal"
											pattern="[0-9]*([.,][0-9]+)?"
											type="text"
											value={entry ? entry.amount : ''}
											oninput={handleAmountInput(s, year)}
										/>
									{:else}
										{entry ? entry.amount : ''}
									{/if}
								</td>
							{/each}

							{#if editable && $ability.can('update', container) && years.length > 0}
								<td class="resource-data__value resource-data__value--placeholder"></td>
							{/if}
						</tr>
					{/each}
				{/if}
				{#if editable && $ability.can('update', container)}
					<tr>
						<td class="resource-data__row-label" colspan={2 + years.length}>
							<button class="resource-data__icon-button" type="button" onclick={addSeries}>
								<Plus />
								<span>{$_('add_item')}</span>
							</button>
						</td>
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

	.resource-data__edit-label {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		margin: 0;
	}

	.resource-data__title {
		color: var(--color-gray-900);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.25;
		margin: 0;
	}

	.resource-data__table-wrapper {
		display: block;
		overflow: auto;
		white-space: nowrap;
		border-radius: 8px;
	}

	.resource-data__table {
		border-collapse: collapse;
		width: max-content;
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
		width: 3rem;
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
		width: 3rem;
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
</style>
