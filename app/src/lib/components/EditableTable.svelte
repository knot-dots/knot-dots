<script lang="ts">
	import { tick } from 'svelte';
	import { _, number } from 'svelte-i18n';
	import { type ResourceDataContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export interface ResourceTableRow {
		container: ResourceDataContainer; // has payload.entries
		label: string; // display text
		href?: string; // optional overlay link URL
		subtitle?: string; // optional muted parenthetical text
		editable?: boolean; // whether cells are <input> elements
		dotColor?: string; // CSS color, e.g. 'var(--color-primary-300)'
	}

	export interface ResourceTableSection {
		heading?: string; // already-translated section heading
		rows: ResourceTableRow[]; // data rows
		showSum?: boolean; // auto-compute & render a sum row
		emptyMessage?: string; // shown when rows is empty
	}

	interface Props {
		title: string; // card title (translated)
		titleUnit: string; // unit label (translated)
		columnLabel: string; // first column header (translated), e.g. "Data object" or "Goal"
		sections: ResourceTableSection[];
		fillYearGaps?: boolean; // fill gaps between min/max year (default: false)
		onSave: (container: ResourceDataContainer) => Promise<{ guid: string; revision: number }>;
	}

	let { title, titleUnit, columnLabel, sections, fillYearGaps = false, onSave }: Props = $props();

	// Derived list of all years present in the data, used for rendering columns
	const dataYears = $derived(
		sections.flatMap((s) => s.rows.flatMap((r) => r.container.payload.entries.map((e) => e.year)))
	);

	// Holds years that have been added by the user in the UI or "locked in" from data
	let additionalYears: number[] = $state([]);

	// Lock in any years that appear in data so they stay visible even if data is deleted
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

		// If no years at all, show current year as placeholder
		if (allYears.length === 0) {
			return [new Date().getFullYear()];
		}

		// Fill year gaps if requested (for budget mode)
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

	function getAmountByYear(container: ResourceDataContainer): Map<number, number> {
		return new Map(container.payload.entries.map((e) => [e.year, e.amount]));
	}

	function sumByYear(containers: ResourceDataContainer[]): Map<number, number> {
		const sumMap = new Map<number, number>();
		for (const container of containers) {
			const amounts = getAmountByYear(container);
			for (const [year, amount] of amounts) {
				sumMap.set(year, (sumMap.get(year) ?? 0) + amount);
			}
		}
		return sumMap;
	}

	const isEditMode = $derived($applicationState.containerDetailView.editable);

	// Column count for table - depends on number of years and whether we're in edit mode (which shows the add year buttons)
	const columnCount = $derived(isEditMode ? years.length + 2 : years.length + 1);

	// Debounce timers
	let saveTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

	let tableContainer = $state<HTMLDivElement | null>(null);

	function addEntryLeft() {
		// If we're showing only the placeholder year, commit it to additionalYears first
		if (additionalYears.length === 0 && dataYears.length === 0) {
			additionalYears.push(new Date().getFullYear());
		}

		const newYear = years[0] - 1;
		additionalYears.push(newYear);
	}

	async function addEntryRight() {
		// If we're showing only the placeholder year, commit it to additionalYears first
		if (additionalYears.length === 0 && dataYears.length === 0) {
			additionalYears.push(new Date().getFullYear());
		}

		const newYear = years[years.length - 1] + 1;
		additionalYears.push(newYear);

		await tick();
		tableContainer?.scrollTo({ left: tableContainer.scrollWidth, behavior: 'instant' });
	}

	function formatNumber(value: number): string {
		return $number(value, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 10
		});
	}

	// Generic input handler for editable cells
	function handleInput(
		year: number,
		event: Event,
		container: ResourceDataContainer,
		timerKey: string,
		locale: string = navigator.language
	) {
		const input = event.currentTarget as HTMLInputElement;

		// Locale-aware number parsing and validation
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

		// Stop propagation to prevent parent form's autoSave from double-saving
		event.stopPropagation();

		// Handle empty input (delete entry)
		if (input.value === '') {
			container.payload.entries = container.payload.entries.filter((e) => e.year !== year);
			debouncedSave(container, timerKey);
			return;
		}

		if (Number.isNaN(parsed)) return;

		// Update or add entry
		const entryIndex = container.payload.entries.findIndex((e) => e.year === year);
		if (entryIndex >= 0) {
			container.payload.entries[entryIndex].amount = parsed;
		} else {
			container.payload.entries = [...container.payload.entries, { year, amount: parsed }].sort(
				(a, b) => a.year - b.year
			);
		}

		debouncedSave(container, timerKey);
	}

	function debouncedSave(containerToSave: ResourceDataContainer, timerKey: string) {
		clearTimeout(saveTimers[timerKey]);
		saveTimers[timerKey] = setTimeout(async () => {
			try {
				const result = await onSave(containerToSave);
				// Update the local container with server-assigned guid and revision
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

<div class="editable-table">
	<div class="editable-table__header">
		<div class="editable-table__heading">
			<span class="editable-table__title">{title}</span>
			<span class="editable-table__title-muted">{$_('preposition.in')}</span>
			<span class="editable-table__title-unit">{titleUnit}</span>
		</div>
	</div>

	<div class="editable-table__wrapper" bind:this={tableContainer}>
		<table class="editable-table__table">
			<thead class="editable-table__head">
				<tr>
					<th class="editable-table__head-label">
						<div class="editable-table__head-content">
							<span>{columnLabel}</span>
							<span class="editable-table__head-years">
								<span>{$_('resource_table.in_years')}</span>
								{#if isEditMode}
									<button
										class="editable-table__head-action"
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
								aria-label={$_('resource_table.add_year')}
								onclick={addEntryRight}
							>
								+
							</button>
						</th>
					{/if}
				</tr>
			</thead>

			<!-- Dynamic sections -->
			{#each sections as section, sectionIndex (section.heading)}
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
						{#each section.rows as row, rowIndex (row.container.guid)}
							{@const valuesByYear = getAmountByYear(row.container)}
							{@const timerKey = `${sectionIndex}-${rowIndex}`}
							<tr class:editable-table__dot-row={row.dotColor} style:--dot-color={row.dotColor}>
								<th
									scope="row"
									class="editable-table__row-label"
									class:editable-table__row-label--editable={row.editable}
								>
									{#if row.href}
										<a href={row.href}>{row.label}</a>
									{:else}
										{row.label}
									{/if}
									{#if row.subtitle}
										<span class="editable-table__row-subtitle">({row.subtitle})</span>
									{/if}
								</th>
								{#each years as year (year)}
									{@const value = valuesByYear.get(year)}
									{@const canEdit =
										row.editable && isEditMode && $ability.can('update', row.container)}
									<td
										class="editable-table__cell focus-indicator"
										class:editable-table__cell--empty={!hasValue(value)}
										class:editable-table__cell--locked={isEditMode && !row.editable}
										class:editable-table__cell--bold={row.editable}
									>
										{#if canEdit}
											<input
												class="editable-table__input"
												type="text"
												inputmode="decimal"
												value={hasValue(value) ? formatNumber(value) : ''}
												placeholder="0"
												oninput={(e) => handleInput(year, e, row.container, timerKey)}
											/>
										{:else}
											{hasValue(value) ? formatNumber(value) : ''}
										{/if}
									</td>
								{/each}
								{#if isEditMode}
									<td
										class="editable-table__cell"
										class:editable-table__cell--locked={isEditMode && !row.editable}
									>
									</td>
								{/if}
							</tr>
						{/each}

						{#if section.showSum}
							{@const sumByYearMap = sumByYear(section.rows.map((r) => r.container))}
							<tr class="editable-table__sum-row">
								<th scope="row" class="editable-table__row-label">{$_('resource_table.sum')}</th>
								{#each years as year (year)}
									<td class="editable-table__cell" class:editable-table__cell--locked={isEditMode}>
										{hasValue(sumByYearMap.get(year))
											? formatNumber(sumByYearMap.get(year) as number)
											: ''}
									</td>
								{/each}
								{#if isEditMode}
									<td class="editable-table__cell"> </td>
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
		background: var(--color-white);
		border: 0.0625rem solid var(--color-gray-200);
		border-radius: 1rem;
		box-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.08);
		padding: 1rem;
	}

	/* Header */
	.editable-table__header {
		padding: 0.5rem;
	}

	.editable-table__heading {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.editable-table__title {
		color: var(--color-gray-900);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.25;
	}

	.editable-table__title-muted,
	.editable-table__title-unit {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.25;
	}

	.editable-table__title-muted {
		color: var(--color-gray-500);
	}

	.editable-table__title-unit {
		color: var(--color-gray-900);
	}

	/* Table */
	.editable-table__wrapper {
		overflow: auto;
		padding: 0.5rem;
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
		background: var(--color-yellow-100);
		border-color: var(--color-yellow-200);
		color: var(--color-yellow-900);
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
	.editable-table__table tbody:last-of-type tr:last-child th:first-child {
		border-radius: 0 0 0 1rem;
		overflow: hidden;
	}
	.editable-table__table tbody:last-of-type tr:last-child td:last-child {
		border-radius: 0 0 1rem 0;
		overflow: hidden;
	}

	.editable-table__head-label {
		min-width: 18.75rem;
		text-align: left;
	}

	.editable-table__head-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
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
		background: var(--color-yellow-200);
	}

	.editable-table__head-year {
		background: var(--color-gray-050);
		color: var(--color-gray-600);
		text-align: right;
		width: 7.5rem;
	}

	.editable-table__head-year.editable-table__head-year--current {
		background: var(--color-yellow-200);
		font-weight: 600;
	}

	/* Rows */
	.editable-table__row-label {
		color: var(--color-gray-800);
		background-color: white;
		font-weight: 500;
		text-align: left;
		white-space: normal;
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

	.editable-table__section-header {
		background: var(--color-gray-025);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	.editable-table__sum-row th,
	.editable-table__sum-row td {
		font-weight: 600;
	}

	/* Cells */
	.editable-table__cell {
		text-align: right;
	}

	.editable-table__cell--empty {
		color: var(--color-gray-400);
	}

	.editable-table__cell--locked {
		background: repeating-linear-gradient(45deg, #fff5f5, #fff5f5 2px, #ffebeb 2px 4px);
	}

	.editable-table__cell--bold {
		font-weight: 600;
	}

	/* Input */
	.editable-table__input {
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

	.editable-table__input:focus-visible {
		outline: none;
	}

	/* Empty state */
	.editable-table__empty {
		color: var(--color-gray-500);
		font-style: italic;
		padding: 1.5rem;
		text-align: center;
	}

	/* Row subtitle */
	.editable-table__row-subtitle {
		color: var(--color-gray-600);
		font-weight: 400;
		font-size: 0.8125rem;
		margin-left: 0.375rem;
	}

	/* Generic dot indicator via CSS custom property */
	.editable-table__dot-row .editable-table__row-label::before {
		content: '';
		display: inline-block;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		margin-right: 0.5rem;
		vertical-align: middle;
		background: var(--dot-color);
	}

	@media (max-width: 56.25rem) {
		.editable-table__head-label {
			min-width: 13.75rem;
		}

		.editable-table__row-label {
			max-width: 13.75rem;
		}

		.editable-table__title {
			font-size: 1rem;
		}
	}
</style>
