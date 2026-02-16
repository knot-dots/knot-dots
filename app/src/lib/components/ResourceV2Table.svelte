<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { _, number } from 'svelte-i18n';
	import saveContainer from '$lib/client/saveContainer';
	import {
		type Container,
		type ResourceV2Container,
		type ResourceDataContainer,
		type NewContainer,
		isResourceDataBudgetContainer,
		isResourceDataPlannedResourceAllocationContainer,
		isResourceDataActualResourceAllocationContainer,
		isResourceDataBudgetTotalContainer,
		isResourceDataPrognosisContainer,
		findAncestors,
		predicates,
		overlayKey,
		overlayURL,
		isMeasureContainer,
		isGoalContainer,
		containerOfType,
		payloadTypes,
		resourceDataTypes,
		isResourceDataContainer,
		etag,
		visibility
	} from '$lib/models';
	import { ability, applicationState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: ResourceV2Container;
		relatedContainers: Container[];
	}

	let { container, relatedContainers }: Props = $props();

	let budgetContainers = $derived(relatedContainers.filter(isResourceDataBudgetContainer));
	let plannedContainers = $derived(
		relatedContainers.filter(isResourceDataPlannedResourceAllocationContainer)
	);
	let actualContainers = $derived(
		relatedContainers.filter(isResourceDataActualResourceAllocationContainer)
	);
	let budgetTotalContainer = $derived(relatedContainers.find(isResourceDataBudgetTotalContainer));
	let prognosisContainer = $derived(relatedContainers.find(isResourceDataPrognosisContainer));

	// Helper to create a stub container for optimistic UI
	function createStub(
		resourceDataType: 'resource_data_type.budget_total' | 'resource_data_type.prognosis',
		title: string
	): ResourceDataContainer {
		return {
			guid: 'TEMPORARY_NEW',
			revision: 1,
			user: [],
			payload: {
				type: payloadTypes.enum.resource_data,
				resourceDataType,
				title,
				resource: container.guid,
				entries: [],
				visibility: visibility.enum.organization
			},
			organization: container.organization,
			organizational_unit: container.organizational_unit,
			managed_by: container.managed_by,
			realm: container.realm,
			relation: [
				{
					object: container.guid,
					subject: 'TEMPORARY_NEW',
					position: 0,
					predicate: predicates.enum['is-part-of']
				}
			],
			valid_from: new Date(),
			valid_currently: true
		} as ResourceDataContainer;
	}

	// Initialize local state for budgetTotal and prognosis containers with stubs
	let budgetTotalState = $state(
		createStub(resourceDataTypes.enum['resource_data_type.budget_total'], 'Budget Total')
	);
	let prognosisState = $state(
		createStub(resourceDataTypes.enum['resource_data_type.prognosis'], 'Prognosis')
	);

	// Initialize state and sync from server when needed
	$effect(() => {
		if (budgetTotalContainer) budgetTotalState = budgetTotalContainer;
	});

	$effect(() => {
		if (prognosisContainer) prognosisState = prognosisContainer;
	});

	// Holds years that have been added by the user in the UI
	let additionalYears: number[] = $state([]);

	let years = $derived.by(() => {
		const allYears = Array.from(
			new Set([
				...budgetContainers.flatMap((c) => c.payload.entries.map((e) => e.year)),
				...plannedContainers.flatMap((c) => c.payload.entries.map((e) => e.year)),
				...actualContainers.flatMap((c) => c.payload.entries.map((e) => e.year)),
				...(budgetTotalContainer?.payload.entries.map((e) => e.year) ?? []),
				...(prognosisContainer?.payload.entries.map((e) => e.year) ?? []),
				...additionalYears
			])
		).sort((a, b) => a - b);
		return allYears.length > 0 ? allYears : [new Date().getFullYear()];
	});

	$inspect(years);

	function getRelatedMeasureOrGoal(resourceDataContainer: Container) {
		const ancestors = findAncestors(resourceDataContainer, relatedContainers, [
			predicates.enum['is-part-of']
		]);
		return ancestors.find((c) => isMeasureContainer(c) || isGoalContainer(c));
	}

	function getAmountByYear(resourceDataContainer: Container) {
		if (!isResourceDataContainer(resourceDataContainer)) {
			return new Map<number, number>();
		}
		return new Map(resourceDataContainer.payload.entries.map((e) => [e.year, e.amount]));
	}

	function sumByYear(containers: Container[]) {
		const sumMap = new Map<number, number>();
		for (const c of containers) {
			const amounts = getAmountByYear(c);
			for (const [year, amount] of amounts) {
				sumMap.set(year, (sumMap.get(year) ?? 0) + amount);
			}
		}
		return sumMap;
	}

	let budgetSumByYear = $derived(sumByYear(budgetContainers));
	let plannedSumByYear = $derived(sumByYear(plannedContainers));
	let actualSumByYear = $derived(sumByYear(actualContainers));

	let budgetTotalByYear = $derived(
		budgetTotalState ? getAmountByYear(budgetTotalState) : new Map<number, number>()
	);
	let prognosisByYear = $derived(
		prognosisState ? getAmountByYear(prognosisState) : new Map<number, number>()
	);

	const isEditMode = $derived($applicationState.containerDetailView.editable);

	// Column count for CSS grid - depends on number of years and whether we're in edit mode (which shows the add year buttons)
	const columnCount = $derived(isEditMode ? years.length + 2 : years.length + 1);

	const editableBudgetTotal = $derived(
		$applicationState.containerDetailView.editable &&
			(budgetTotalState.guid !== 'TEMPORARY_NEW'
				? $ability.can('update', budgetTotalState)
				: $mayCreateContainer(
						payloadTypes.enum.resource_data,
						page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
					))
	);

	const editablePrognosis = $derived(
		$applicationState.containerDetailView.editable &&
			(prognosisState.guid !== 'TEMPORARY_NEW'
				? $ability.can('update', prognosisState)
				: $mayCreateContainer(
						payloadTypes.enum.resource_data,
						page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
					))
	);

	// Debounce timers
	let saveTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

	function addEntryLeft() {
		additionalYears.push(years[0] - 1);
	}

	function addEntryRight() {
		additionalYears.push(years[years.length - 1] + 1);
	}

	function formatNumber(value: number): string {
		return $number(value, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 10
		});
	}

	// Handle input for budgetTotal or prognosis cells (now completely synchronous)
	function handleInput(
		year: number,
		event: Event,
		type: 'budgetTotal' | 'prognosis',
		locale: string = navigator.language
	) {
		const input = event.currentTarget as HTMLInputElement;

		// ... [Formatting Logic - Validated, kept brief for answer] ...
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

		// Get the current container state (guaranteed to exist due to initialization effects)
		const currentContainer = type === 'budgetTotal' ? budgetTotalState : prognosisState;
		if (!currentContainer) return; // Safety check

		// Handle empty input (delete entry)
		if (input.value === '') {
			currentContainer.payload.entries = currentContainer.payload.entries.filter(
				(e) => e.year !== year
			);
			debouncedSave(currentContainer, type);
			return;
		}

		if (Number.isNaN(parsed)) return;

		// Update or add entry
		const entryIndex = currentContainer.payload.entries.findIndex((e) => e.year === year);
		if (entryIndex >= 0) {
			currentContainer.payload.entries[entryIndex].amount = parsed;
		} else {
			currentContainer.payload.entries = [
				...currentContainer.payload.entries,
				{ year, amount: parsed }
			].sort((a, b) => a.year - b.year);
		}

		debouncedSave(currentContainer, type);
	}

	function debouncedSave(
		containerToSave: ResourceDataContainer,
		type: 'budgetTotal' | 'prognosis'
	) {
		clearTimeout(saveTimers[type]);
		saveTimers[type] = setTimeout(async () => {
			const isNewContainer = containerToSave.guid === 'TEMPORARY_NEW';

			let response: Response;

			if (isNewContainer) {
				// Create new container (POST)
				const newContainer = containerOfType(
					payloadTypes.enum.resource_data,
					container.organization,
					container.organizational_unit,
					container.managed_by,
					container.realm
				) as NewContainer;

				// Set the resourceDataType from the type being edited
				newContainer.payload = containerToSave.payload;

				// Set relations to the current organitzation/unit
				newContainer.relation = [
					{
						object: page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
						position: 0,
						predicate: predicates.enum['is-part-of']
					}
				];

				console.log('Creating new container:', newContainer);

				response = await saveContainer(newContainer);
			} else {
				// Update existing container (PUT)
				response = await saveContainer(containerToSave);
			}

			if (response.ok) {
				const updated = await response.json();

				// Update the local container with server-assigned guid and revision
				// This happens BEFORE invalidate, so the $effect will see matching revisions
				// and won't overwrite our local state (which may have been edited again)
				containerToSave.guid = updated.guid;
				containerToSave.revision = updated.revision;

				await invalidate('containers');
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}, 2000);
	}

	function hasValue(value: number | undefined | null): value is number {
		return value !== undefined && value !== null;
	}
</script>

<div class="resource-table">
	<div class="resource-table__header">
		<div class="resource-table__heading">
			<span class="resource-table__title">Ressourcenbedarf</span>
			<span class="resource-table__title-muted">in</span>
			<span class="resource-table__title-unit">{$_(container.payload.resourceUnit)}</span>
		</div>
	</div>

	<div class="resource-table__wrapper">
		<table class="resource-table__table">
			<thead class="resource-table__head">
				<tr>
					<th class="resource-table__head-label">
						<div class="resource-table__head-content">
							<span>{$_('resource_table.data_object')}</span>
							<span class="resource-table__head-years">
								<span>{$_('resource_table.in_years')}</span>
								{#if isEditMode}
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
					{#if isEditMode}
						<th class="resource-table__head-year resource-table__head-year--action">
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

			<!-- Gesamt-Budgets Section -->
			<tbody>
				<tr class="resource-table__section-row">
					<th class="resource-table__section-header" colspan={columnCount}>
						{$_('resource_table.total_budget')}
					</th>
				</tr>

				<tr class="resource-table__budget-total-row">
					<th scope="row" class="resource-table__row-label">{$_('resource_table.past_years')}</th>
					{#each years as year (year)}
						{@const value = budgetTotalByYear.get(year)}
						<td
							class="resource-table__cell focus-indicator"
							class:resource-table__cell--empty={!hasValue(value)}
							class:resource-table__cell--locked={!editableBudgetTotal}
						>
							<input
								class="resource-table__input"
								type="text"
								inputmode="decimal"
								value={hasValue(value) ? formatNumber(value) : ''}
								placeholder="0"
								oninput={(e) => handleInput(year, e, 'budgetTotal')}
								disabled={!editableBudgetTotal}
							/>
						</td>
					{/each}
					{#if isEditMode}
						<td class="resource-table__cell"> </td>
					{/if}
				</tr>

				<tr class="resource-table__prognosis-row">
					<th scope="row" class="resource-table__row-label">{$_('resource_table.prognosis')}</th>
					{#each years as year (year)}
						{@const value = prognosisByYear.get(year)}
						<td
							class="resource-table__cell focus-indicator"
							class:resource-table__cell--empty={!hasValue(value)}
							class:resource-table__cell--locked={!editablePrognosis}
						>
							<input
								class="resource-table__input"
								type="text"
								inputmode="decimal"
								value={hasValue(value) ? formatNumber(value) : ''}
								placeholder="0"
								oninput={(e) => handleInput(year, e, 'prognosis')}
								disabled={!editablePrognosis}
							/>
						</td>
					{/each}
					{#if isEditMode}
						<td class="resource-table__cell"> </td>
					{/if}
				</tr>

				<!-- Budgets Section -->
				<tr class="resource-table__section-row">
					<th class="resource-table__section-header" colspan={columnCount}>
						{$_('resource_table.budgets')}
					</th>
				</tr>

				{#each budgetContainers as budgetContainer (budgetContainer.guid)}
					{@const valuesByYear = getAmountByYear(budgetContainer)}
					{@const relatedContainer = getRelatedMeasureOrGoal(budgetContainer)}
					<tr class="resource-table__budget-row">
						<th scope="row" class="resource-table__row-label">
							{#if relatedContainer}
								<a href={overlayURL(page.url, overlayKey.enum.view, relatedContainer.guid)}>
									{relatedContainer.payload.title}
								</a>
							{:else}
								{budgetContainer.payload.title}
							{/if}
						</th>
						{#each years as year (year)}
							{@const value = valuesByYear.get(year)}
							<td
								class="resource-table__cell"
								class:resource-table__cell--empty={!hasValue(value)}
								class:resource-table__cell--editable={isEditMode}
							>
								{hasValue(value) ? formatNumber(value) : ''}
							</td>
						{/each}
						{#if isEditMode}
							<td class="resource-table__cell"> </td>
						{/if}
					</tr>
				{/each}

				<tr class="resource-table__budget-sum-row resource-table__sum-row">
					<th scope="row" class="resource-table__row-label">{$_('resource_table.sum')}</th>
					{#each years as year (year)}
						<td class="resource-table__cell" class:resource-table__cell--editable={isEditMode}>
							{hasValue(budgetSumByYear.get(year))
								? formatNumber(budgetSumByYear.get(year) as number)
								: ''}
						</td>
					{/each}
					{#if isEditMode}
						<td class="resource-table__cell"> </td>
					{/if}
				</tr>
			</tbody>

			<!-- Erwarteter Ressourcenbedarf Section -->
			<tbody>
				<tr class="resource-table__section-row">
					<th class="resource-table__section-header" colspan={columnCount}>
						{$_('resource_data_type.planned_resource_allocation')}
					</th>
				</tr>

				{#each plannedContainers as plannedContainer (plannedContainer.guid)}
					{@const valuesByYear = getAmountByYear(plannedContainer)}
					{@const relatedContainer = getRelatedMeasureOrGoal(plannedContainer)}
					<tr class="resource-table__planned-row">
						<th scope="row" class="resource-table__row-label">
							{#if relatedContainer}
								<a href={overlayURL(page.url, overlayKey.enum.view, relatedContainer.guid)}>
									{relatedContainer.payload.title}
								</a>
							{:else}
								{plannedContainer.payload.title}
							{/if}
						</th>
						{#each years as year (year)}
							{@const value = valuesByYear.get(year)}
							<td
								class="resource-table__cell"
								class:resource-table__cell--empty={!hasValue(value)}
								class:resource-table__cell--editable={isEditMode}
							>
								{hasValue(value) ? formatNumber(value) : ''}
							</td>
						{/each}
						{#if isEditMode}
							<td class="resource-table__cell"> </td>
						{/if}
					</tr>
				{/each}

				<tr class="resource-table__planned-sum-row resource-table__sum-row">
					<th scope="row" class="resource-table__row-label">{$_('resource_table.sum')}</th>
					{#each years as year (year)}
						<td class="resource-table__cell" class:resource-table__cell--editable={isEditMode}>
							{hasValue(plannedSumByYear.get(year))
								? formatNumber(plannedSumByYear.get(year) as number)
								: ''}
						</td>
					{/each}
					{#if isEditMode}
						<td class="resource-table__cell"> </td>
					{/if}
				</tr>
			</tbody>

			<!-- Verwendete Ressourcen Section -->
			<tbody>
				<tr class="resource-table__section-row">
					<th class="resource-table__section-header" colspan={columnCount}>
						{$_('resource_data_type.actual_resource_allocation')}
					</th>
				</tr>

				{#each actualContainers as actualContainer (actualContainer.guid)}
					{@const valuesByYear = getAmountByYear(actualContainer)}
					{@const relatedContainer = getRelatedMeasureOrGoal(actualContainer)}
					<tr class="resource-table__actual-row">
						<th scope="row" class="resource-table__row-label">
							{#if relatedContainer}
								<a href={overlayURL(page.url, overlayKey.enum.view, relatedContainer.guid)}>
									{relatedContainer.payload.title}
								</a>
							{:else}
								{actualContainer.payload.title}
							{/if}
						</th>
						{#each years as year (year)}
							{@const value = valuesByYear.get(year)}
							<td
								class="resource-table__cell"
								class:resource-table__cell--empty={!hasValue(value)}
								class:resource-table__cell--editable={isEditMode}
							>
								{hasValue(value) ? formatNumber(value) : ''}
							</td>
						{/each}
						{#if isEditMode}
							<td class="resource-table__cell"> </td>
						{/if}
					</tr>
				{/each}

				<tr class="resource-table__actual-sum-row resource-table__sum-row">
					<th scope="row" class="resource-table__row-label">{$_('resource_table.sum')}</th>
					{#each years as year (year)}
						<td class="resource-table__cell" class:resource-table__cell--editable={isEditMode}>
							{hasValue(actualSumByYear.get(year))
								? formatNumber(actualSumByYear.get(year) as number)
								: ''}
						</td>
					{/each}
					{#if isEditMode}
						<td class="resource-table__cell"> </td>
					{/if}
				</tr>
			</tbody>
		</table>
	</div>
</div>

<style>
	.resource-table {
		background: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 16px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		padding: 16px;
	}

	/* Header */
	.resource-table__header {
		padding: 8px;
	}

	.resource-table__heading {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.resource-table__title {
		color: var(--color-gray-900);
		font-size: 18px;
		font-weight: 500;
		line-height: 1.25;
	}

	.resource-table__title-muted,
	.resource-table__title-unit {
		font-size: 14px;
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
		padding: 8px;
	}

	.resource-table__table {
		min-width: 100%;
		width: max-content;
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: 0;
		border-radius: 16px;
		overflow: hidden;
	}

	.resource-table__table th,
	.resource-table__table td {
		border: 1px solid var(--color-gray-200);
		font-size: 14px;
		line-height: 1.5;
		padding: 12px 8px;
		white-space: nowrap;
	}

	.resource-table__head th {
		background: var(--color-yellow-100);
		border-color: var(--color-yellow-200);
		color: var(--color-yellow-900);
		font-weight: 400;
	}

	.resource-table__head th:first-child {
		border-radius: 16px 0 0 0;
		overflow: hidden;
	}
	.resource-table__head th:last-child {
		border-radius: 0 16px 0 0;
		overflow: hidden;
	}
	.resource-table__table tbody:last-of-type tr:last-child th:first-child {
		border-radius: 0 0 0 16px;
		overflow: hidden;
	}
	.resource-table__table tbody:last-of-type tr:last-child td:last-child {
		border-radius: 0 0 16px 0;
		overflow: hidden;
	}

	.resource-table__head-label {
		min-width: 300px;
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
		gap: 4px;
	}

	.resource-table__head-action {
		font-weight: 600;
		font-size: large;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		width: 28px;
		padding: 0;
	}

	.resource-table__head-action:hover {
		background: var(--color-yellow-200);
	}

	.resource-table__head-year {
		background: var(--color-gray-050);
		color: var(--color-gray-600);
		text-align: right;
		width: 120px;
	}

	.resource-table__head-year.resource-table__head-year--current {
		background: var(--color-yellow-200);
		font-weight: 600;
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

	.resource-table__section-header {
		background: var(--color-gray-050);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	.resource-table__sum-row th,
	.resource-table__sum-row td {
		font-weight: 600;
	}

	/* Cells */
	.resource-table__cell {
		text-align: right;
	}

	.resource-table__cell--editable {
		background-color: var(--color-red-050);
	}

	.resource-table__cell--locked {
		color: var(--color-gray-500);
		cursor: not-allowed;
	}

	/* Input */
	.resource-table__input {
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

	.resource-table__input:disabled {
		cursor: not-allowed;
	}

	.resource-table__input:focus-visible {
		outline: 2px solid var(--focus-color);
		outline-offset: 2px;
		outline-style: none;
	}

	/* Row type indicators */
	.resource-table__budget-row .resource-table__row-label::before,
	.resource-table__planned-row .resource-table__row-label::before,
	.resource-table__actual-row .resource-table__row-label::before {
		content: '';
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-right: 8px;
		vertical-align: middle;
	}

	.resource-table__budget-row .resource-table__row-label::before {
		background: var(--color-primary-300);
	}

	.resource-table__planned-row .resource-table__row-label::before {
		background: var(--color-orange-300);
	}

	.resource-table__actual-row .resource-table__row-label::before {
		background: var(--color-red-400);
	}

	@media (max-width: 900px) {
		.resource-table__head-label {
			min-width: 220px;
		}

		.resource-table__title {
			font-size: 16px;
		}
	}
</style>
