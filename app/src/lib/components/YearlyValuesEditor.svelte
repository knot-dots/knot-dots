<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import Minus from '~icons/flowbite/minus-outline';
	import Plus from '~icons/flowbite/plus-outline';
	import tooltip from '$lib/attachments/tooltip';

	// Rows of a year with one value per column. The years follow each other
	// without gaps, so rows are added and removed at either end. A column of
	// values that are only shown, such as the actual data of an indicator, may
	// follow the editable ones.
	interface Props {
		columns: string[];
		shown?: { heading: string; values: Map<number, number> };
		value: Array<[number, ...number[]]>;
	}

	let { columns, shown, value = $bindable() }: Props = $props();

	let columnCount = $derived(columns.length + (shown ? 3 : 2));

	function newRow(year: number): [number, ...number[]] {
		return [year, ...columns.map(() => 0)];
	}

	function prependRow() {
		value = [newRow(value[0][0] - 1), ...value];
	}

	function appendRow() {
		value = [...value, newRow(value[value.length - 1][0] + 1)];
	}

	function removeRow(index: number) {
		value = value.toSpliced(index, 1);
	}

	// Enter must not submit an enclosing form while values are being entered.
	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
		}
	}
</script>

<table>
	<thead>
		<tr>
			<th class="year" scope="col">{$_('indicator.table.year')}</th>
			{#each columns as heading, column (column)}
				<th scope="col">{heading}</th>
			{/each}
			{#if shown}
				<th scope="col">{shown.heading}</th>
			{/if}
			<td class="action"></td>
		</tr>
	</thead>
	<tbody>
		<tr class="add-row">
			<td colspan={columnCount}>
				<button
					onclick={prependRow}
					type="button"
					{@attach tooltip($_('create_objective_or_effect_dialog.add_row'))}
				>
					<Plus />
				</button>
			</td>
		</tr>
		{#each value as row, index (row[0])}
			<tr>
				<th class="year" scope="row">{row[0]}</th>
				{#each columns as heading, column (column)}
					<td>
						<input
							aria-label="{heading} {row[0]}"
							bind:value={row[column + 1]}
							inputmode="decimal"
							{onkeydown}
							step="any"
							type="number"
						/>
					</td>
				{/each}
				{#if shown}
					{@const shownValue = shown.values.get(row[0])}
					<td class="shown">{shownValue === undefined ? '' : $number(shownValue)}</td>
				{/if}
				<td class="action">
					{#if value.length > 1 && (index === 0 || index === value.length - 1)}
						<button
							onclick={() => removeRow(index)}
							type="button"
							{@attach tooltip($_('create_objective_or_effect_dialog.remove_row'))}
						>
							<Minus />
						</button>
					{/if}
				</td>
			</tr>
		{/each}
		<tr class="add-row">
			<td colspan={columnCount}>
				<button
					onclick={appendRow}
					type="button"
					{@attach tooltip($_('create_objective_or_effect_dialog.add_row'))}
				>
					<Plus />
				</button>
			</td>
		</tr>
	</tbody>
</table>

<style>
	table {
		border-collapse: collapse;
		width: 100%;
	}

	tr {
		border: none;
	}

	th,
	td {
		border-bottom: solid 1px var(--color-gray-100);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.5;
		padding: 0.75rem 0.5rem;
	}

	thead th {
		color: var(--color-gray-500);
		padding: 0.5rem;
		text-align: left;
	}

	tbody th {
		color: var(--color-gray-900);
		text-align: left;
	}

	.year {
		width: 5rem;
	}

	.action {
		padding: 0;
		text-align: center;
		width: 2.5rem;
	}

	.add-row td {
		padding: 0.25rem 0;
	}

	.shown {
		color: var(--color-gray-500);
		text-align: right;
	}

	input {
		appearance: textfield;
		background-color: transparent;
		border: none;
		border-radius: 0;
		color: var(--color-gray-700);
		line-height: 1.5;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	input::-webkit-inner-spin-button,
	input::-webkit-outer-spin-button {
		appearance: none;
		margin: 0;
	}

	button {
		--button-active-background: transparent;
		--button-hover-background: var(--color-gray-050);

		border: none;
		color: var(--color-gray-500);
		height: 2rem;
		padding: 0 0.625rem;
	}

	button > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}
</style>
