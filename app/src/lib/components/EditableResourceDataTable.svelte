<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import requestSubmit from '$lib/client/requestSubmit';
	import type { ResourceDataContainer } from '$lib/models';
	import { tick } from 'svelte';

	interface Props {
		container: ResourceDataContainer;
		editable: boolean;
	}

	let { container, editable }: Props = $props();

	let tableContainer = $state<HTMLDivElement | null>(null);

	function handleYearInput(event: Event, entry: { year: number; amount: number }) {
		const input = event.currentTarget as HTMLInputElement;

		if (!input.validity.valid) {
			event.stopPropagation();
			return;
		}

		const parsed = parseInt(input.value, 10);
		if (!Number.isNaN(parsed)) {
			entry.year = parsed;
		}
	}

	function handleAmountInput(event: Event, entry: { year: number; amount: number }) {
		const input = event.currentTarget as HTMLInputElement;

		if (!input.validity.valid) {
			event.stopPropagation();
			return;
		}

		// Handle both comma and period as decimal separators
		const normalized = input.value.replace(',', '.');
		const parsed = parseFloat(normalized);
		if (!Number.isNaN(parsed)) {
			entry.amount = parsed;
		}
	}

	function addEntryLeft(e: MouseEvent) {
		const currentYear = new Date().getFullYear();
		const entries = container.payload.entries;
		const year = entries.length === 0 ? currentYear : (entries[0]?.year ?? currentYear) - 1;

		container.payload.entries = [{ year, amount: 0 }, ...entries];
		requestSubmit(e);
	}

	async function addEntryRight(e: MouseEvent) {
		const currentYear = new Date().getFullYear();
		const entries = container.payload.entries;
		const year =
			entries.length === 0 ? currentYear : (entries[entries.length - 1]?.year ?? currentYear) + 1;

		container.payload.entries = [...entries, { year, amount: 0 }];
		requestSubmit(e);

		await tick();
		tableContainer?.scrollTo({ left: tableContainer.scrollWidth, behavior: 'smooth' });
	}
</script>

<div class="resource-data__table-wrapper" bind:this={tableContainer}>
	<table class="resource-data__table">
		<thead>
			<tr>
				{#if editable}
					<th scope="col" class="resource-data__action-cell resource-data__action-cell--left">
						<button
							aria-label={$_('add_item')}
							class="resource-data__cell-action"
							onclick={addEntryLeft}
							type="button"
						>
							<Plus />
						</button>
					</th>
				{/if}

				{#each container.payload.entries as entry (entry.year)}
					<th scope="col" class="resource-data__year">
						{#if editable}
							<input
								class="resource-data__year-input"
								value={entry.year}
								oninput={(e) => handleYearInput(e, entry)}
								type="text"
								inputmode="numeric"
								pattern="[0-9]+"
							/>
						{:else}
							{entry.year}
						{/if}
					</th>
				{/each}

				{#if editable && container.payload.entries.length > 0}
					<th scope="col" class="resource-data__action-cell resource-data__action-cell--right">
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
					<td class="resource-data__empty" colspan={container.payload.entries.length + 2}>
						{$_('empty')}
					</td>
				</tr>
			{:else}
				<tr>
					{#if editable}
						<td class="resource-data__stub-cell"></td>
					{/if}

					{#each container.payload.entries as entry (entry.year)}
						<td class="resource-data__value">
							{#if editable}
								<input
									value={entry.amount}
									oninput={(e) => handleAmountInput(e, entry)}
									class="resource-data__value-input"
									inputmode="decimal"
									pattern="-?[0-9]*([.,]([0-9]+)?)?"
									type="text"
								/>
							{:else}
								{entry.amount}
							{/if}
						</td>
					{/each}

					{#if editable}
						<td class="resource-data__stub-cell"></td>
					{/if}
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
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
	.resource-data__table tbody td {
		border: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.5;
		padding: 12px 8px;
		white-space: nowrap;
	}

	.resource-data__table thead th {
		background-color: var(--color-gray-100);
		height: 40px;
		padding: 8px;
		text-align: right;
		vertical-align: middle;
	}

	.resource-data__action-cell {
		width: 56px;
		text-align: center;
	}

	.resource-data__action-cell--left {
		border-top-left-radius: 4px;
	}

	.resource-data__action-cell--right {
		border-top-right-radius: 4px;
	}

	.resource-data__year {
		width: 64px;
		background-color: var(--color-gray-50);
		color: var(--color-gray-600);
		text-align: right;
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

	.resource-data__table tbody td {
		background-color: var(--color-white);
		min-height: 48px;
		padding: 12px 8px;
		vertical-align: middle;
	}

	.resource-data__stub-cell {
		width: 56px;
		padding: 0;
		background-color: var(--color-white);
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

	.resource-data__empty {
		color: var(--color-gray-500);
		padding: 0.75rem 0.75rem;
		text-align: left;
	}
</style>
