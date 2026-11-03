<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Minus from '~icons/heroicons/minus-small-solid';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		value: Array<[number, number]>;
	}

	let { value = $bindable() }: Props = $props();

	function addRow() {
		const years = value.map(([year]) => year).filter(Number.isInteger);
		value = [...value, [years.length > 0 ? Math.max(...years) + 1 : new Date().getFullYear(), 0]];
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
			<th scope="col">{$_('indicator.table.year')}</th>
			<th scope="col">{$_('indicator.effect.planned_values')}</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each value as row, index (index)}
			<tr>
				<td>
					<input
						aria-label={$_('indicator.table.year')}
						bind:value={row[0]}
						inputmode="numeric"
						min="1"
						{onkeydown}
						step="1"
						type="number"
					/>
				</td>
				<td>
					<input
						aria-label={$_('indicator.effect.planned_values')}
						bind:value={row[1]}
						inputmode="decimal"
						{onkeydown}
						step="any"
						type="number"
					/>
				</td>
				<td>
					{#if value.length > 1}
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
		<tr>
			<td colspan="3">
				<button
					onclick={addRow}
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
	input {
		background-color: transparent;
		border: none;
		border-radius: 0;
		line-height: 1.5;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	table {
		width: fit-content;
	}

	tr:last-of-type {
		border-bottom: none;
	}

	th {
		color: var(--color-gray-600);
		font-weight: 400;
	}

	td > button {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0;
		--padding-y: 0;

		border: none;
		color: var(--color-gray-500);
		display: block;
	}

	td:hover,
	tr:hover td:hover input {
		background-color: var(--color-gray-100);
	}

	tr:hover,
	tr:hover input {
		background-color: var(--color-gray-050);
	}
</style>
