<script lang="ts">
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { _, number } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		type GoalContainer,
		type MeasureContainer,
		type ResourceDataContainer,
		type ResourceV2Container,
		predicates,
		overlayKey,
		overlayURL,
		payloadTypes,
		isGoalContainer,
		isMeasureContainer,
		isResourceDataBudgetContainer,
		findDescendants,
		isResourceDataContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		currentBudget: ResourceDataContainer;
		resourceContainer?: ResourceV2Container;
		editable: boolean;
	}

	let { currentBudget, resourceContainer, editable }: Props = $props();

	let organization = $derived(currentBudget.organization);

	// Fetch all goals and measures
	let goalContainers = $state<GoalContainer[]>([]);
	let measureContainers = $state<MeasureContainer[]>([]);

	$effect(() => {
		fetchContainers(
			{
				organization: [organization],
				payloadType: [payloadTypes.enum.goal, payloadTypes.enum.measure]
			},
			'alpha'
		).then((containers) => {
			goalContainers = containers.filter(isGoalContainer);
			measureContainers = containers.filter(isMeasureContainer);
		});
	});

	// Find parent goal and subordinate goals
	let parentGoal = $derived.by(() => {
		const parentGuid = currentBudget.relation.find(
			(r) => r.predicate === predicates.enum['is-part-of'] && r.subject === currentBudget.guid
		)?.object;
		return goalContainers.find((g) => g.guid === parentGuid);
	});

	let subordinateGoals = $derived.by(() => {
		if (!parentGoal) return [];
		return findDescendants(parentGoal, goalContainers, [predicates.enum['is-part-of']]);
	});

	// Find subordinate measures (includes measures for parent goal and all subordinate goals)
	let subordinateMeasures = $derived.by(() => {
		if (!parentGoal) return [];
		const goalGuids = new Set([parentGoal.guid, ...subordinateGoals.map((g) => g.guid)]);
		return measureContainers.filter((measure) =>
			measure.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && goalGuids.has(r.object)
			)
		);
	});

	// Fetch all resource_data containers
	let allResourceDataContainers = $state<ResourceDataContainer[]>([]);

	$effect(() => {
		if (!parentGoal) {
			allResourceDataContainers = [];
			return;
		}

		fetchContainers(
			{
				organization: [organization],
				payloadType: [payloadTypes.enum.resource_data]
			},
			'alpha'
		).then((containers) => {
			allResourceDataContainers = containers.filter(isResourceDataContainer);
		});
	});

	// Derive budget containers for subordinate goals
	let allBudgetContainers = $derived.by(() => {
		const subordinateGoalGuids = new Set(subordinateGoals.map((g) => g.guid));
		return allResourceDataContainers
			.filter(isResourceDataBudgetContainer)
			.filter((c) =>
				c.relation.some(
					(r) => r.predicate === predicates.enum['is-part-of'] && subordinateGoalGuids.has(r.object)
				)
			);
	});

	// Holds years that have been added by the user in the UI
	let additionalYears: number[] = $state([]);

	let tableContainer = $state<HTMLDivElement | null>(null);

	// Get all unique years from current budget and all subordinate budget containers
	let years = $derived.by(() => {
		const allYears = [
			...currentBudget.payload.entries.map((e) => e.year),
			...allBudgetContainers.flatMap((c) => c.payload.entries.map((e) => e.year)),
			...additionalYears
		];

		const hasActualData =
			currentBudget.payload.entries.length > 0 ||
			allBudgetContainers.some((c) => c.payload.entries.length > 0);

		// If no actual data exists, always include current year as anchor
		if (!hasActualData) {
			allYears.push(new Date().getFullYear());
		}

		if (allYears.length === 0) {
			return [new Date().getFullYear()];
		}

		// Fill in all years between min and max to avoid gaps
		const minYear = Math.min(...allYears);
		const maxYear = Math.max(...allYears);
		const completeYears = [];
		for (let year = minYear; year <= maxYear; year++) {
			completeYears.push(year);
		}
		return completeYears;
	});

	// Helper to get budget containers for a specific goal
	function getBudgetsForGoal(goal: GoalContainer): ResourceDataContainer[] {
		return allBudgetContainers.filter((budget) =>
			budget.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === goal.guid
			)
		);
	}

	// Helper to get resource data containers for a specific measure
	function getResourceDataForMeasure(measure: MeasureContainer): ResourceDataContainer[] {
		return allResourceDataContainers.filter((rd) =>
			rd.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === measure.guid
			)
		);
	}

	// Helper to get amount by year for a container
	function getAmountByYear(resourceDataContainer: ResourceDataContainer) {
		return new Map(resourceDataContainer.payload.entries.map((e) => [e.year, e.amount]));
	}

	function formatNumber(value: number): string {
		return $number(value, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 10
		});
	}

	function hasValue(value: number | undefined | null): value is number {
		return value !== undefined && value !== null;
	}

	const resourceUnit = $derived(resourceContainer?.payload.resourceUnit ?? 'undefined');

	const editableCurrentBudget = $derived(
		$applicationState.containerDetailView.editable && $ability.can('update', currentBudget)
	);

	function addEntryLeft(e: MouseEvent) {
		additionalYears.push(years[0] - 1);
		requestSubmit(e);
	}

	async function addEntryRight(e: MouseEvent) {
		additionalYears.push(years[years.length - 1] + 1);
		requestSubmit(e);

		await tick();
		tableContainer?.scrollTo({ left: tableContainer.scrollWidth, behavior: 'instant' });
	}

	// Handle input for current budget cells
	function handleInput(year: number, event: Event, locale: string = navigator.language) {
		const input = event.currentTarget as HTMLInputElement;

		// Formatting Logic
		const parts = new Intl.NumberFormat(locale).formatToParts(1000.1);
		const decimalSeparator = parts.find((part) => part.type === 'decimal')?.value ?? '.';
		const thousandSeparator = parts.find((part) => part.type === 'group')?.value ?? ',';
		const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const localePattern = new RegExp(
			`^-?\\d+(${escapeRegex(thousandSeparator)}\\d+)*(${escapeRegex(decimalSeparator)}\\d+)?$`
		);
		const isValidFormat = input.value === '' || localePattern.test(input.value);
		const normalized = input.value
			.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
			.replace(new RegExp(`\\${decimalSeparator}`), '.');
		const parsed = parseFloat(normalized);

		if (input.value && (!isValidFormat || Number.isNaN(parsed))) {
			input.setCustomValidity($_('invalid_number'));
		} else {
			input.setCustomValidity('');
		}
		if (!input.validity.valid) {
			event.stopPropagation();
			return;
		}

		// Handle empty input (delete entry)
		if (input.value === '') {
			currentBudget.payload.entries = currentBudget.payload.entries.filter((e) => e.year !== year);
			requestSubmit(event);
			return;
		}

		if (Number.isNaN(parsed)) return;

		// Update or add entry
		const entryIndex = currentBudget.payload.entries.findIndex((e) => e.year === year);
		if (entryIndex >= 0) {
			currentBudget.payload.entries[entryIndex].amount = parsed;
		} else {
			currentBudget.payload.entries = [
				...currentBudget.payload.entries,
				{ year, amount: parsed }
			].sort((a, b) => a.year - b.year);
		}

		requestSubmit(event);
	}

	let currentBudgetByYear = $derived(getAmountByYear(currentBudget));

	let colspan = $derived(editable ? years.length + 2 : years.length + 1);
</script>

<div class="resource-table">
	<div class="resource-table__header">
		<div class="resource-table__heading">
			<span class="resource-table__title">{$_('resource_table.subordinate_goals_budget')}</span>
			<span class="resource-table__title-muted">{$_('preposition.in')}</span>
			<span class="resource-table__title-unit">{$_(resourceUnit)}</span>
		</div>
	</div>

	<div class="resource-table__wrapper" bind:this={tableContainer}>
		<table class="resource-table__table">
			<thead class="resource-table__head">
				<tr>
					<th class="resource-table__head-label">
						<div class="resource-table__head-content">
							<span>{$_('goal')}</span>
							<span class="resource-table__head-years">
								<span>{$_('resource_table.in_years')}</span>
								{#if editable}
									<button
										class="resource-table__head-action"
										type="button"
										aria-label={$_('resource_table.add_year')}
										onclick={addEntryLeft}
									>
										+
									</button>
								{/if}
							</span>
						</div>
					</th>
					{#each years as year (year)}
						<th
							class="resource-table__head-year"
							class:resource-table__head-year--current={year === new Date().getFullYear()}
						>
							{year}
						</th>
					{/each}
					{#if editable}
						<th class="resource-table__head-year">
							<button
								class="resource-table__head-action"
								type="button"
								aria-label={$_('resource_table.add_year')}
								onclick={addEntryRight}
							>
								+
							</button>
						</th>
					{/if}
				</tr>
			</thead>

			<tbody>
				<!-- Current Budget Section -->
				<tr>
					<th class="resource-table__section-header" {colspan}>
						{$_('resource_table.current_budget')}
					</th>
				</tr>

				{#if parentGoal}
					<tr class="resource-table__budget-row">
						<th scope="row" class="resource-table__row-label">
							<a href={overlayURL(page.url, overlayKey.enum.view, parentGoal.guid)}>
								{parentGoal.payload.title}
							</a>
						</th>
						{#each years as year (year)}
							{@const value = currentBudgetByYear.get(year)}
							<td
								class="resource-table__cell focus-indicator"
								class:resource-table__cell--empty={!hasValue(value)}
							>
								<input
									class="resource-table__input"
									type="text"
									inputmode="decimal"
									value={hasValue(value) ? formatNumber(value) : ''}
									placeholder="0"
									oninput={(e) => handleInput(year, e)}
									disabled={!editableCurrentBudget}
								/>
							</td>
						{/each}
						{#if editable}
							<td class="resource-table__cell"> </td>
						{/if}
					</tr>
				{:else}
					<tr>
						<td {colspan} class="resource-table__empty">
							{$_('resource_table.no_parent_goal')}
						</td>
					</tr>
				{/if}
			</tbody>

			<tbody>
				<!-- Subordinate Goals Section -->
				<tr>
					<th class="resource-table__section-header" {colspan}>
						{$_('resource_table.subordinate_goals')}
					</th>
				</tr>

				{#if subordinateGoals.length === 0 || allBudgetContainers.length === 0}
					<tr>
						<td {colspan} class="resource-table__empty">
							{$_('resource_table.no_subordinate_goals')}
						</td>
					</tr>
				{:else}
					{#each subordinateGoals as goal (goal.guid)}
						{@const budgets = getBudgetsForGoal(goal)}
						{#if budgets.length > 0}
							{#each budgets as budget (budget.guid)}
								{@const valuesByYear = getAmountByYear(budget)}
								<tr class="resource-table__budget-row">
									<th scope="row" class="resource-table__row-label">
										<a href={overlayURL(page.url, overlayKey.enum.view, goal.guid)}>
											{goal.payload.title}
										</a>
										{#if budget.payload.title}
											<span class="resource-table__row-subtitle">
												({budget.payload.title})
											</span>
										{/if}
									</th>
									{#each years as year (year)}
										{@const value = valuesByYear.get(year)}
										<td
											class="resource-table__cell"
											class:resource-table__cell--empty={!hasValue(value)}
											class:resource-table__cell--editable={editable}
										>
											{hasValue(value) ? formatNumber(value) : ''}
										</td>
									{/each}
									{#if editable}
										<td class="resource-table__cell"> </td>
									{/if}
								</tr>
							{/each}
						{/if}
					{/each}
				{/if}
			</tbody>

			<tbody>
				<!-- Subordinate Measures Section -->
				<tr>
					<th class="resource-table__section-header" {colspan}>
						{$_('resource_table.subordinate_measures')}
					</th>
				</tr>

				{#if subordinateMeasures.length === 0 || !subordinateMeasures.some((m) => getResourceDataForMeasure(m).length > 0)}
					<tr>
						<td {colspan} class="resource-table__empty">
							{$_('resource_table.no_subordinate_measures')}
						</td>
					</tr>
				{:else}
					{#each subordinateMeasures as measure (measure.guid)}
						{@const resourceDataContainers = getResourceDataForMeasure(measure)}
						{#if resourceDataContainers.length > 0}
							{#each resourceDataContainers as resourceData (resourceData.guid)}
								{@const valuesByYear = getAmountByYear(resourceData)}
								<tr class="resource-table__measure-row">
									<th scope="row" class="resource-table__row-label">
										<a href={overlayURL(page.url, overlayKey.enum.view, measure.guid)}>
											{measure.payload.title}
										</a>
										{#if resourceData.payload.title}
											<span class="resource-table__row-subtitle">
												({resourceData.payload.title})
											</span>
										{/if}
									</th>
									{#each years as year (year)}
										{@const value = valuesByYear.get(year)}
										<td
											class="resource-table__cell"
											class:resource-table__cell--empty={!hasValue(value)}
											class:resource-table__cell--editable={editable}
										>
											{hasValue(value) ? formatNumber(value) : ''}
										</td>
									{/each}
									{#if editable}
										<td class="resource-table__cell"> </td>
									{/if}
								</tr>
							{/each}
						{/if}
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.resource-table {
		background: var(--color-white);
		border: 0.0625rem solid var(--color-gray-200);
		border-radius: 1rem;
		box-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.08);
		padding: 1rem;
	}

	/* Header */
	.resource-table__header {
		padding: 0.5rem;
	}

	.resource-table__heading {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.resource-table__title {
		color: var(--color-gray-900);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.25;
	}

	.resource-table__title-muted,
	.resource-table__title-unit {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.25;
	}

	.resource-table__title-muted {
		color: var(--color-gray-500);
	}

	.resource-table__title-unit {
		color: var(--color-gray-900);
	}

	/* Table */
	.resource-table__wrapper {
		overflow: auto;
		padding: 0.5rem;
	}

	.resource-table__table {
		width: fit-content;
		border-collapse: separate;
		border-spacing: 0;
		border-radius: 1rem;
		overflow: hidden;
	}

	.resource-table__table th,
	.resource-table__table td {
		border: 0.0625rem solid var(--color-gray-200);
		font-size: 0.875rem;
		line-height: 1.5;
		padding: 0.75rem 0.5rem;
		white-space: nowrap;
	}

	.resource-table__head th {
		background: var(--color-yellow-100);
		border-color: var(--color-yellow-200);
		color: var(--color-yellow-900);
		font-weight: 400;
	}

	.resource-table__head th:first-child {
		border-radius: 1rem 0 0 0;
		overflow: hidden;
	}
	.resource-table__head th:last-child {
		border-radius: 0 1rem 0 0;
		overflow: hidden;
	}
	.resource-table__table tbody:last-of-type tr:last-child th:first-child {
		border-radius: 0 0 0 1rem;
		overflow: hidden;
	}
	.resource-table__table tbody:last-of-type tr:last-child td:last-child {
		border-radius: 0 0 1rem 0;
		overflow: hidden;
	}

	.resource-table__head-label {
		min-width: 18.75rem;
		text-align: left;
	}

	.resource-table__head-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.resource-table__head-years {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.resource-table__head-year {
		background: var(--color-gray-050);
		color: var(--color-gray-600);
		text-align: right;
		width: 7.5rem;
	}

	.resource-table__head-year.resource-table__head-year--current {
		background: var(--color-yellow-200);
		font-weight: 600;
	}

	.resource-table__head-action {
		font-weight: 600;
		font-size: large;
		background: transparent;
		border: 0.0625rem solid transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 1.75rem;
		width: 1.75rem;
		padding: 0;
	}

	.resource-table__head-action:hover {
		background: var(--color-yellow-200);
	}

	/* Rows */
	.resource-table__row-label {
		color: var(--color-gray-800);
		background-color: white;
		font-weight: 500;
		text-align: left;
		white-space: normal;
	}

	tr:hover .resource-table__row-label {
		background-color: var(--color-gray-050);
	}

	.resource-table__row-label a:hover {
		text-decoration: underline;
	}

	.resource-table__row-subtitle {
		color: var(--color-gray-600);
		font-weight: 400;
		font-size: 0.8125rem;
		margin-left: 0.375rem;
	}

	.resource-table__section-header {
		background: var(--color-gray-050);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	/* Cells */
	.resource-table__cell {
		text-align: right;
	}

	.resource-table__cell--empty {
		color: var(--color-gray-400);
	}

	.resource-table__cell--editable {
		background-color: var(--color-red-050);
	}

	/* Input */
	.resource-table__input {
		font-weight: 600;
		background: transparent;
		border: none;
		box-sizing: border-box;
		color: inherit;
		field-sizing: content;
		min-width: 0;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	.resource-table__input:focus-visible {
		outline: none;
	}

	.resource-table__empty {
		color: var(--color-gray-500);
		font-style: italic;
		padding: 1.5rem;
		text-align: center;
	}

	/* Budget row indicator */
	.resource-table__budget-row .resource-table__row-label::before {
		content: '';
		display: inline-block;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		margin-right: 0.5rem;
		vertical-align: middle;
		background: var(--color-primary-300);
	}

	/* Measure row indicator */
	.resource-table__measure-row .resource-table__row-label::before {
		content: '';
		display: inline-block;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		margin-right: 0.5rem;
		vertical-align: middle;
		background: var(--color-orange-300);
	}

	@media (max-width: 56.25rem) {
		.resource-table__head-label {
			min-width: 13.75rem;
		}

		.resource-table__title {
			font-size: 1rem;
		}
	}
</style>
