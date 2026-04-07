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

<h2 class="details-heading">
	{title}
	<small>{titleUnit}</small>
</h2>

<div bind:this={tableContainer} class="editable-table" data-variant={variant}>
	<table>
		<thead>
			<tr>
				<th class="head-label">
					<div class="head-content">
						<span>{columnLabel}</span>
						<span class="head-years">
							<span>{yearLabel}</span>
							{#if isEditMode}
								<button
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
					<th class="year" class:current={year === new Date().getFullYear()}>
						{year}
					</th>
				{/each}
				{#if isEditMode}
					<th>
						<button type="button" aria-label={addYearLabel} onclick={addEntryRight}> + </button>
					</th>
				{/if}
			</tr>
		</thead>

		<!-- Dynamic sections -->
		{#each sections as section (section.heading)}
			<tbody>
				{#if section.heading}
					<tr>
						<th class="section-heading" colspan={columnCount}>{section.heading}</th>
					</tr>
				{/if}

				{#if section.rows.length === 0 && section.emptyMessage}
					<tr>
						<td colspan={columnCount} class="empty">{section.emptyMessage}</td>
					</tr>
				{:else}
					{#each section.rows as row (row.id)}
						{#if isActionRow(row)}
							<tr class="action">
								<td colspan={columnCount}>
									<button type="button" disabled={row.disabled} onclick={row.onAction}>
										{#if row.loading}
											<span class="loader"></span>
										{:else}
											<span class="plus">+</span>
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
									class="row-label truncated"
									scope="row"
									class:editable={canEdit}
									class:indented={row.indented}
								>
									{#if row.dotColor}
										<span class="dot" style:background-color={row.dotColor}></span>
									{/if}
									{#if row.href}
										<a href={row.href}>{row.label}</a>
									{:else}
										<span>{row.label}</span>
									{/if}
									{#if row.subtitle}
										<span class="subtitle">({row.subtitle})</span>
									{/if}
								</th>
								{#each years as year (year)}
									{@const value = valuesByYear.get(year)}
									<td
										class="value focus-indicator"
										class:missing={!hasValue(value)}
										class:locked={isEditMode && !canEdit}
										class:editable={canEdit}
									>
										{#if canEdit}
											<input
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
									<td class:locked={isEditMode && !canEdit}></td>
								{/if}
							</tr>
						{/if}
					{/each}

					{#if section.showSum}
						{@const sumByYearMap = sumByYear(section.rows.filter(isDataRow))}
						<tr class="sum">
							<th class="row-label" scope="row">{$_('table.sum')}</th>
							{#each years as year (year)}
								<td class="value" class:locked={isEditMode}>
									{hasValue(sumByYearMap.get(year))
										? formatNumber(sumByYearMap.get(year) as number)
										: ''}
								</td>
							{/each}
							{#if isEditMode}
								<td class:locked={isEditMode}></td>
							{/if}
						</tr>
					{/if}
				{/if}
			</tbody>
		{/each}
	</table>
</div>

<style>
	.details-heading {
		margin-top: 1.5rem;
	}

	.editable-table {
		--head-background: var(--color-yellow-100);
		--head-border: var(--color-yellow-200);
		--head-text: var(--color-yellow-900);
		--head-current-background: var(--color-yellow-200);
		--head-action-hover: var(--color-yellow-200);
		--label-width: 18.75rem;
		--value-column-width: 3.5rem;

		margin-left: var(--editable-table-margin-left, 0);
		margin-right: var(--editable-table-margin-right, 0);
		margin-top: 1rem;
		overflow: auto;
		padding-left: calc(var(--carousel-margin-left) * -1);
		padding-right: 4rem;
	}

	.editable-table[data-variant='teal'] {
		--head-background: var(--color-teal-100);
		--head-border: var(--color-teal-200);
		--head-text: var(--color-teal-900);
		--head-current-background: #b9eef0;
		--head-action-hover: #c3f0f2;
	}

	.details-heading > small {
		color: var(--color-gray-500);
		font-size: 1.25rem;
		font-weight: 400;
		line-height: 1.25;
	}

	table {
		width: fit-content;
		border-collapse: separate;
		border-spacing: 0;
	}

	th,
	td {
		border-bottom: 1px solid var(--color-gray-200);
		border-right: 1px solid var(--color-gray-200);
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: nowrap;
	}

	tr > :first-child {
		border-left: 1px solid var(--color-gray-200);
	}

	thead th {
		background: var(--head-background);
		border-color: var(--head-border);
		border-top: 1px solid var(--head-border);
		color: var(--head-text);
		font-weight: 400;
	}

	.head-label {
		min-width: var(--label-width);
		text-align: left;
		border-radius: 4px 0 0 0;
	}

	thead tr > :last-child {
		border-radius: 0 4px 0 0;
	}

	.head-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.head-years {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.year {
		color: var(--color-gray-600);
		text-align: right;
		width: var(--value-column-width);
		min-width: var(--value-column-width);
	}

	.year.current {
		background: var(--head-current-background);
		font-weight: 600;
	}

	thead button {
		align-items: center;
		background: transparent;
		border: 0.0625rem solid transparent;
		border-radius: 8px;
		cursor: pointer;
		display: inline-flex;
		font-size: large;
		font-weight: 600;
		height: 1.75rem;
		justify-content: center;
		padding: 0;
		width: 1.75rem;
	}

	thead button:hover {
		background: var(--head-action-hover);
	}

	tbody:last-of-type tr:last-child > :first-child {
		border-radius: 0 0 0 4px;
	}

	tbody:last-of-type tr:last-child > :last-child {
		border-radius: 0 0 4px 0;
	}

	.section-heading {
		background: var(--color-gray-025);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	.row-label {
		color: var(--color-gray-800);
		font-weight: 500;
		max-width: var(--label-width);
		padding: 0.75rem 0.5rem 0.75rem 1rem;
		text-align: left;
	}

	.row-label a:hover {
		text-decoration: underline;
	}

	.row-label.indented {
		padding-left: 1.5rem;
	}

	.row-label > :not(.dot) {
		min-width: 0;
	}

	.row-label > :not(.dot):not(.subtitle) {
		color: var(--color-gray-800);
		font-weight: 500;
	}

	tbody th.editable,
	tbody td.editable {
		font-weight: 600;
	}

	.subtitle {
		color: var(--color-gray-500);
	}

	.dot {
		border-radius: 50%;
		display: inline-block;
		flex: 0 0 auto;
		margin-right: 0.25rem;
		height: 0.75rem;
		width: 0.75rem;
		vertical-align: -1px;
	}

	.value {
		text-align: right;
		width: var(--value-column-width);
		min-width: var(--value-column-width);
	}

	tbody td.missing {
		color: var(--color-gray-400);
	}

	tbody td.locked {
		background: var(--color-gray-025);
	}

	tr.sum th,
	tr.sum td {
		font-weight: 600;
	}

	.value input {
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		margin: -0.25rem -0.125rem;
		padding: 0.25rem 0.125rem;
		text-align: right;
		width: 100%;
	}

	.value input:focus {
		outline: none;
	}

	tr.action td {
		background: white;
		text-align: left;
	}

	tr.action button {
		align-items: center;
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		color: var(--color-gray-900);
		display: inline-flex;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		padding: 0.5rem 0.75rem;
	}

	tr.action button:disabled {
		opacity: 0.6;
	}

	.plus {
		color: var(--color-gray-500);
		font-size: 1rem;
		line-height: 1;
	}

	td.empty {
		color: var(--color-gray-500);
		text-align: left;
	}
</style>
