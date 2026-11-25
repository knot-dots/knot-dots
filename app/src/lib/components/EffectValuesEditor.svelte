<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Minus from '~icons/flowbite/minus-outline';
	import Plus from '~icons/flowbite/plus-outline';
	import tooltip from '$lib/attachments/tooltip';

	// Rows of a year with its planned and its achieved value. The years follow
	// each other without gaps, so rows are added and removed at either end.
	interface Props {
		value: Array<[number, number, number]>;
	}

	let { value = $bindable() }: Props = $props();

	function prependRow() {
		value = [[value[0][0] - 1, 0, 0], ...value];
	}

	function appendRow() {
		value = [...value, [value[value.length - 1][0] + 1, 0, 0]];
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
			<th scope="col">{$_('indicator.effect.planned_values')}</th>
			<th scope="col">{$_('indicator.effect.achieved_values')}</th>
			<td class="action"></td>
		</tr>
	</thead>
	<tbody>
		<tr class="add-row">
			<td colspan="4">
				<button
					onclick={prependRow}
					type="button"
					{@attach tooltip($_('create_effect_dialog.add_row'))}
				>
					<Plus />
				</button>
			</td>
		</tr>
		{#each value as row, index (row[0])}
			<tr>
				<th class="year" scope="row">{row[0]}</th>
				<td>
					<input
						aria-label="{$_('indicator.effect.planned_values')} {row[0]}"
						bind:value={row[1]}
						inputmode="decimal"
						{onkeydown}
						step="any"
						type="number"
					/>
				</td>
				<td>
					<input
						aria-label="{$_('indicator.effect.achieved_values')} {row[0]}"
						bind:value={row[2]}
						inputmode="decimal"
						{onkeydown}
						step="any"
						type="number"
					/>
				</td>
				<td class="action">
					{#if value.length > 1 && (index === 0 || index === value.length - 1)}
						<button
							onclick={() => removeRow(index)}
							type="button"
							{@attach tooltip($_('create_effect_dialog.remove_row'))}
						>
							<Minus />
						</button>
					{/if}
				</td>
			</tr>
		{/each}
		<tr class="add-row">
			<td colspan="4">
				<button
					onclick={appendRow}
					type="button"
					{@attach tooltip($_('create_effect_dialog.add_row'))}
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
