<script lang="ts">
	import { tick } from 'svelte';
	import { _, number } from 'svelte-i18n';
	import type { AnyContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export interface EditableTableValue {
		year: number;
		value: number;
	}

	export interface EditableTableDataRow {
		type?: 'data';
		id: string;
		container: AnyContainer;
		label: string;
		href?: string;
		subtitle?: string;
		editable?: boolean;
		dotColor?: string;
		values?: EditableTableValue[];
		indented?: boolean;
	}

	export interface EditableTableActionRow {
		type: 'action';
		id: string;
		label: string;
		onAction: () => void | Promise<void>;
		disabled?: boolean;
		loading?: boolean;
	}

	export type EditableTableRow = EditableTableDataRow | EditableTableActionRow;

	export interface EditableTableSection {
		heading?: string;
		rows: EditableTableRow[];
		showSum?: boolean;
		emptyMessage?: string;
	}

	interface Props {
		title: string;
		titleUnit: string;
		columnLabel: string;
		yearLabel?: string;
		addYearLabel?: string;
		sections: EditableTableSection[];
		fillYearGaps?: boolean;
		variant?: 'yellow' | 'teal';
		getEntries: (container: AnyContainer) => EditableTableValue[];
		setEntry: (container: AnyContainer, year: number, value: number | null) => void;
		onSave: (container: AnyContainer) => Promise<{ guid: string; revision: number }>;
	}

	let {
		title,
		titleUnit,
		columnLabel,
		yearLabel = $_('table.in_years'),
		addYearLabel = $_('table.add_column_right'),
		sections,
		fillYearGaps = false,
		variant = 'yellow',
		getEntries,
		setEntry,
		onSave
	}: Props = $props();

	function isDataRow(row: EditableTableRow): row is EditableTableDataRow {
		return row.type !== 'action';
	}

	function isActionRow(row: EditableTableRow): row is EditableTableActionRow {
		return row.type === 'action';
	}

	// Read all persisted years from the caller-provided row data so the table can build
	// one shared set of columns regardless of the underlying container shape
	const dataYears = $derived(
		sections.flatMap((section) =>
			section.rows.filter(isDataRow).flatMap((row) => getRowValues(row).map((entry) => entry.year))
		)
	);

	let additionalYears: number[] = $state([]);

	// Keep user-added year columns visible even if the current edit temporarily clears
	// all values for that year before the save completes
	$effect(() => {
		for (const year of dataYears) {
			if (!additionalYears.includes(year)) {
				additionalYears.push(year);
			}
		}
	});

	// All years to render as columns, sorted and with optional gap filling
	let years = $derived.by(() => {
		const allYears = Array.from(new Set([...dataYears, ...additionalYears])).sort((a, b) => a - b);

		// If no years are persisted yet, show the current year as a placeholder column
		if (allYears.length === 0) {
			return [new Date().getFullYear()];
		}

		// Fill year gaps for budget-like tables that need continuous ranges
		if (fillYearGaps && allYears.length > 0) {
			const minYear = allYears[0];
			const maxYear = allYears[allYears.length - 1];
			const filledYears = [];
			for (let year = minYear; year <= maxYear; year++) {
				filledYears.push(year);
			}
			return filledYears;
		}

		return allYears;
	});

	function getRowValues(row: EditableTableDataRow): EditableTableValue[] {
		return row.values ?? getEntries(row.container);
	}

	function getValueByYear(row: EditableTableDataRow): Map<number, number> {
		return new Map(getRowValues(row).map((entry) => [entry.year, entry.value]));
	}

	function sumByYear(rows: EditableTableDataRow[]): Map<number, number> {
		const sumMap = new Map<number, number>();
		for (const row of rows) {
			for (const [year, value] of getValueByYear(row)) {
				sumMap.set(year, (sumMap.get(year) ?? 0) + value);
			}
		}
		return sumMap;
	}

	const isEditMode = $derived($applicationState.containerDetailView.editable);

	// Column count depends on whether edit mode adds the trailing control column
	const columnCount = $derived(isEditMode ? years.length + 2 : years.length + 1);

	// Save timers debounce per-row persistence to avoid issuing a request on every keystroke
	let saveTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
	let tableContainer = $state<HTMLDivElement | null>(null);

	async function addEntryLeft() {
		// If we're showing only the placeholder year, commit it before extending the range
		if (additionalYears.length === 0 && dataYears.length === 0) {
			additionalYears.push(new Date().getFullYear());
		}

		const newYear = years[0] - 1;
		additionalYears.push(newYear);

		await tick();

		// Focus the first input in the newly added year column
		const firstInput = tableContainer?.querySelector(
			`input[data-year="${newYear}"]`
		) as HTMLInputElement;
		firstInput?.focus();
	}

	async function addEntryRight() {
		// If we're showing only the placeholder year, commit it before extending the range
		if (additionalYears.length === 0 && dataYears.length === 0) {
			additionalYears.push(new Date().getFullYear());
		}

		const newYear = years[years.length - 1] + 1;
		additionalYears.push(newYear);

		await tick();

		// Scroll the wrapper so the newly created rightmost column becomes visible
		tableContainer?.scrollTo({ left: tableContainer.scrollWidth, behavior: 'instant' });

		// Focus the first input in the newly added year column
		const firstInput = tableContainer?.querySelector(
			`input[data-year="${newYear}"]`
		) as HTMLInputElement;
		firstInput?.focus();
	}

	function formatNumber(value: number): string {
		return $number(value, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 10,
			useGrouping: true
		});
	}

	function rowCanEdit(row: EditableTableDataRow): boolean {
		if (!row.editable || !isEditMode) return false;
		return $ability.can('update', row.container);
	}

	function handleInput(
		year: number,
		event: Event,
		row: EditableTableDataRow,
		timerKey: string,
		locale: string = navigator.language
	) {
		const input = event.currentTarget as HTMLInputElement;

		// Parse user input with the active locale's decimal and thousands separators
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

		// Stop propagation so parent forms or auto-save handlers do not double-save
		event.stopPropagation();

		// Callers own the container-specific mutation logic so the same table component can
		// edit resource entries, indicator values, and future yearly datasets
		setEntry(row.container, year, input.value === '' ? null : parsed);
		if (input.value !== '' && Number.isNaN(parsed)) return;
		debouncedSave(row.container, timerKey);
	}

	function debouncedSave(containerToSave: AnyContainer, timerKey: string) {
		clearTimeout(saveTimers[timerKey]);
		saveTimers[timerKey] = setTimeout(async () => {
			try {
				const result = await onSave(containerToSave);

				// Update the local container with the server-assigned guid and revision
				containerToSave.guid = result.guid;
				containerToSave.revision = result.revision;
			} catch (error) {
				alert(error instanceof Error ? error.message : 'Save failed');
			}
		}, 2000);
	}

	function hasValue(value: number | undefined | null): value is number {
		return value !== undefined && value !== null;
	}
</script>

<div class="details-section editable-table" data-variant={variant}>
	<h2 class="details-heading">
		{title}
		<small>{titleUnit}</small>
	</h2>

	<div class="editable-table__wrapper" bind:this={tableContainer}>
		<table class="editable-table__table">
			<thead class="editable-table__head">
				<tr>
					<th class="editable-table__head-label">
						<div class="editable-table__head-content">
							<span>{columnLabel}</span>
							<span class="editable-table__head-years">
								<span>{yearLabel}</span>
								{#if isEditMode}
									<button
										class="editable-table__head-action"
										type="button"
										aria-label={$_('table.add_column_left')}
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
							class="editable-table__head-year"
							class:editable-table__head-year--current={year === new Date().getFullYear()}
						>
							{year}
						</th>
					{/each}
					{#if isEditMode}
						<th class="editable-table__head-year">
							<button
								class="editable-table__head-action"
								type="button"
								aria-label={addYearLabel}
								onclick={addEntryRight}
							>
								+
							</button>
						</th>
					{/if}
				</tr>
			</thead>

			<!-- Dynamic sections -->
			{#each sections as section (section.heading)}
				<tbody>
					{#if section.heading}
						<tr>
							<th class="editable-table__section-header" colspan={columnCount}>
								{section.heading}
							</th>
						</tr>
					{/if}

					{#if section.rows.length === 0 && section.emptyMessage}
						<tr>
							<td colspan={columnCount} class="editable-table__empty">
								{section.emptyMessage}
							</td>
						</tr>
					{:else}
						{#each section.rows as row (row.id)}
							{#if isActionRow(row)}
								<tr class="editable-table__action-row">
									<td colspan={columnCount} class="editable-table__action-cell">
										<button
											class="editable-table__inline-action"
											type="button"
											disabled={row.disabled}
											onclick={row.onAction}
										>
											{#if row.loading}
												<span class="loader"></span>
											{:else}
												<span class="editable-table__inline-action-plus">+</span>
												{row.label}
											{/if}
										</button>
									</td>
								</tr>
							{:else}
								{@const valuesByYear = getValueByYear(row)}
								{@const canEdit = rowCanEdit(row)}
								{@const timerKey = row.id}
								<tr>
									<th
										scope="row"
										class="editable-table__row-label"
										class:editable-table__row-label--editable={canEdit}
									>
										<div
											class="editable-table__row-label-content"
											class:editable-table__row-label-content--indented={row.indented}
										>
											{#if row.dotColor}
												<span class="editable-table__row-dot" style:background-color={row.dotColor}
												></span>
											{/if}
											{#if row.href}
												<a href={row.href} class="editable-table__row-link">{row.label}</a>
											{:else}
												<span class="editable-table__row-text">{row.label}</span>
											{/if}
											{#if row.subtitle}
												<span class="editable-table__row-subtitle">({row.subtitle})</span>
											{/if}
										</div>
									</th>
									{#each years as year (year)}
										{@const value = valuesByYear.get(year)}
										<td
											class="editable-table__cell focus-indicator"
											class:editable-table__cell--empty={!hasValue(value)}
											class:editable-table__cell--locked={isEditMode && !canEdit}
											class:editable-table__cell--bold={canEdit}
										>
											{#if canEdit}
												<input
													class="editable-table__input"
													type="text"
													inputmode="decimal"
													data-year={year}
													value={hasValue(value) ? formatNumber(value) : ''}
													placeholder="0"
													oninput={(inputEvent) => handleInput(year, inputEvent, row, timerKey)}
												/>
											{:else}
												{hasValue(value) ? formatNumber(value) : ''}
											{/if}
										</td>
									{/each}
									{#if isEditMode}
										<td
											class="editable-table__cell"
											class:editable-table__cell--locked={isEditMode && !canEdit}
										></td>
									{/if}
								</tr>
							{/if}
						{/each}

						{#if section.showSum}
							{@const sumByYearMap = sumByYear(section.rows.filter(isDataRow))}
							<tr class="editable-table__sum-row">
								<th scope="row" class="editable-table__row-label">{$_('table.sum')}</th>
								{#each years as year (year)}
									<td class="editable-table__cell" class:editable-table__cell--locked={isEditMode}>
										{hasValue(sumByYearMap.get(year))
											? formatNumber(sumByYearMap.get(year) as number)
											: ''}
									</td>
								{/each}
								{#if isEditMode}
									<td class="editable-table__cell" class:editable-table__cell--locked={isEditMode}>
									</td>
								{/if}
							</tr>
						{/if}
					{/if}
				</tbody>
			{/each}
		</table>
	</div>
</div>

<style>
	.editable-table {
		--editable-table-head-background: var(--color-yellow-100);
		--editable-table-head-border: var(--color-yellow-200);
		--editable-table-head-text: var(--color-yellow-900);
		--editable-table-head-current-background: var(--color-yellow-200);
		--editable-table-head-action-hover: var(--color-yellow-200);
	}

	.editable-table[data-variant='teal'] {
		--editable-table-head-background: var(--color-teal-100);
		--editable-table-head-border: var(--color-teal-200);
		--editable-table-head-text: var(--color-teal-900);
		--editable-table-head-current-background: #b9eef0;
		--editable-table-head-action-hover: #c3f0f2;
	}

	.details-heading > small {
		color: var(--color-gray-500);
		font-size: 1.25rem;
		font-weight: 400;
		line-height: 1.25;
	}

	.editable-table__wrapper {
		margin-left: var(--editable-table-margin-left, 0);
		margin-right: var(--editable-table-margin-right, 0);
		margin-top: 1.25rem;
		overflow: auto;
		padding-left: calc(var(--carousel-margin-left) * -1);
		padding-right: 4rem;
	}

	.editable-table__table {
		width: fit-content;
		border-collapse: separate;
		border-spacing: 0;
		border-radius: 1rem;
		overflow: hidden;
	}

	.editable-table__table th,
	.editable-table__table td {
		border: 0.0625rem solid var(--color-gray-200);
		font-size: 0.875rem;
		line-height: 1.5;
		padding: 0.75rem 0.5rem;
		white-space: nowrap;
	}

	.editable-table__head th {
		background: var(--editable-table-head-background);
		border-color: var(--editable-table-head-border);
		color: var(--editable-table-head-text);
		font-weight: 400;
	}

	.editable-table__head th:first-child {
		border-radius: 1rem 0 0 0;
		overflow: hidden;
	}

	.editable-table__head th:last-child {
		border-radius: 0 1rem 0 0;
		overflow: hidden;
	}

	.editable-table__table tbody:last-of-type tr:last-child th:first-child,
	.editable-table__table tbody:last-of-type tr:last-child td:last-child {
		overflow: hidden;
	}

	.editable-table__table tbody:last-of-type tr:last-child th:first-child {
		border-radius: 0 0 0 1rem;
	}

	.editable-table__table tbody:last-of-type tr:last-child td:last-child {
		border-radius: 0 0 1rem 0;
	}

	.editable-table__head-label {
		min-width: 18.75rem;
		text-align: left;
	}

	.editable-table__head-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.editable-table__head-years {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.editable-table__head-action {
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

	.editable-table__head-action:hover {
		background: var(--editable-table-head-action-hover);
	}

	.editable-table__head-year {
		background: var(--color-gray-050);
		color: var(--color-gray-600);
		text-align: right;
		width: 3.5rem;
		min-width: 3.5rem;
	}

	.editable-table__head-year.editable-table__head-year--current {
		background: var(--editable-table-head-current-background);
		font-weight: 600;
	}

	.editable-table__row-label {
		color: var(--color-gray-800);
		background-color: white;
		font-weight: 500;
		text-align: left;
		max-width: 18.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	tr:hover .editable-table__row-label {
		background-color: var(--color-gray-050);
	}

	.editable-table__row-label a:hover {
		text-decoration: underline;
	}

	.editable-table__row-label--editable {
		font-weight: 600;
	}

	.editable-table__row-label-content {
		align-items: center;
		display: inline-flex;
		gap: 0.375rem;
		max-width: 100%;
		overflow: hidden;
		padding-right: 0.5rem;
	}

	.editable-table__row-label-content--indented {
		padding-left: 0.5rem;
	}

	.editable-table__row-dot {
		border-radius: 50%;
		display: inline-block;
		flex: 0 0 auto;
		height: 0.75rem;
		width: 0.75rem;
	}

	.editable-table__row-link,
	.editable-table__row-text {
		color: var(--color-gray-800);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.editable-table__row-subtitle {
		color: var(--color-gray-500);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.editable-table__section-header {
		background: var(--color-gray-025);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	.editable-table__sum-row th,
	.editable-table__sum-row td {
		font-weight: 600;
	}

	.editable-table__cell {
		text-align: right;
		width: 3.5rem;
		min-width: 3.5rem;
	}

	.editable-table__cell--empty {
		color: var(--color-gray-400);
	}

	.editable-table__cell--locked {
		background: var(--color-gray-025);
	}

	.editable-table__cell--bold {
		font-weight: 600;
	}

	.editable-table__input {
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		margin: -0.25rem -0.125rem;
		padding: 0.25rem 0.125rem;
		text-align: right;
		width: 100%;
	}

	.editable-table__input:focus {
		outline: none;
	}

	.editable-table__action-cell {
		background: white;
		text-align: left;
	}

	.editable-table__inline-action {
		align-items: center;
		background: white;
		border: 0.0625rem solid var(--color-gray-200);
		border-radius: 0.5rem;
		color: var(--color-gray-900);
		display: inline-flex;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		padding: 0.5rem 0.75rem;
	}

	.editable-table__inline-action-plus {
		color: var(--color-gray-500);
		font-size: 1rem;
		line-height: 1;
	}

	.editable-table__inline-action:disabled {
		opacity: 0.6;
	}

	.editable-table__empty {
		color: var(--color-gray-500);
		text-align: left;
	}
</style>
