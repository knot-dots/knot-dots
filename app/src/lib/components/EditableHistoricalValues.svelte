<script lang="ts">
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import Minus from '~icons/heroicons/minus-small-solid';
	import Plus from '~icons/heroicons/plus-small-solid';
	import requestSubmit from '$lib/client/requestSubmit';
	import type { IndicatorContainer } from '$lib/models';

	interface Props {
		container: IndicatorContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const disclosure = createDisclosure({});

	let newRowKey = $state(0);

	function append() {
		if (container.payload.historicalValues.length == 0) {
			const year = new Date().getFullYear();
			container.payload.historicalValues = [[year, 0]];
			newRowKey = year;
		} else {
			const year =
				container.payload.historicalValues[container.payload.historicalValues.length - 1][0] + 1;
			container.payload.historicalValues = [
				...container.payload.historicalValues,
				[year, container.payload.historicalValues[container.payload.historicalValues.length - 1][1]]
			];
			newRowKey = year;
		}
	}

	function prepend() {
		const year = container.payload.historicalValues[0][0] - 1;
		container.payload.historicalValues = [[year, 0], ...container.payload.historicalValues];
		newRowKey = year;
	}

	function remove(index: number) {
		return (event: Event) => {
			container.payload.historicalValues = [
				...container.payload.historicalValues.slice(0, index),
				...container.payload.historicalValues.slice(index + 1)
			];
			requestSubmit(event);
		};
	}

	function update(index: number) {
		return (event: Event) => {
			if (
				container.payload.historicalValues
					.slice(index)
					.every(([, value]) => value == container.payload.historicalValues[index][1])
			) {
				for (let i = index; i < container.payload.historicalValues.length; i++) {
					container.payload.historicalValues[i][1] = parseFloat(
						(event.currentTarget as HTMLInputElement).value
					);
				}
			} else {
				container.payload.historicalValues[index][1] = parseFloat(
					(event.currentTarget as HTMLInputElement).value
				);
			}
			requestSubmit(event);
		};
	}

	function init(element: HTMLInputElement, shouldFocus: boolean) {
		if (shouldFocus) {
			element.focus();
			element.select();
		}
	}
</script>

<div class="disclosure">
	<button class="disclosure-button" type="button" use:disclosure.button>
		<span>
			<small>{$_('indicator.table.edit')}</small>
			<strong>{container.payload.title} ({$_(container.payload.unit ?? '')})</strong>
		</span>
		{#if $disclosure.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $disclosure.expanded}
		<table use:disclosure.panel>
			<thead>
				<tr>
					<th>{$_('indicator.table.year')}</th>
					<th>{$_('indicator.table.historical_values')}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#if container.payload.historicalValues.length > 0}
					<tr>
						<td colspan="3">
							<button aria-label={$_('append_row')} onclick={prepend} type="button">
								<Plus />
							</button>
						</td>
					</tr>
				{/if}

				{#each container.payload.historicalValues as [key], index (key)}
					<tr>
						<td class="year">
							{container.payload.historicalValues[index][0]}
						</td>
						<td class="focus-indicator">
							{#if editable}
								<input
									inputmode="decimal"
									onchange={update(index)}
									type="text"
									value={container.payload.historicalValues[index][1]}
									use:init={key === newRowKey}
								/>
							{:else}
								{container.payload.historicalValues[index][1]}
							{/if}
						</td>
						<td>
							{#if index === 0 || index === container.payload.historicalValues.length - 1}
								<button aria-label={$_('delete_row')} onclick={remove(index)} type="button">
									<Minus />
								</button>
							{/if}
						</td>
					</tr>
				{/each}

				<tr>
					<td colspan="3">
						<button aria-label={$_('append_row')} onclick={append} type="button">
							<Plus />
						</button>
					</td>
				</tr>
			</tbody>
		</table>
	{/if}
</div>

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

	.disclosure {
		margin-bottom: 1rem;
	}

	.focus-indicator input:focus {
		outline-style: none;
	}

	.year {
		color: var(--color-gray-900);
	}
</style>
