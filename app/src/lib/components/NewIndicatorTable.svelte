<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import {
		type Container,
		type IndicatorTemplateContainer,
		isActualDataContainer
	} from '$lib/models';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers?: Container[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
			.find(({ payload }) => payload.indicator === container.guid)
	);

	let actualValuesByYear = $derived(new Map(actualDataContainer?.payload.values ?? []));

	let years = $derived(Array.from(actualValuesByYear.keys()));
</script>

{#if actualDataContainer}
	<div>
		<table>
			<caption>{$_('indicator.source')}: {actualDataContainer.payload.source}</caption>

			<thead>
				<tr>
					<th></th>
					{#each years as year}
						<th>{year}</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				<tr class="actual-values">
					<th scope="row">{$_('indicator.table.actual_values')}</th>
					{#each years as year}
						<td>{$number(actualValuesByYear.get(year) ?? NaN)}</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</div>
{/if}

<style>
	div {
		overflow-x: scroll;
	}

	table {
		caption-side: bottom;
	}

	caption {
		color: var(--color-gray-500);
		margin-top: 0.25rem;
		text-align: left;
	}

	thead {
		background-color: white;
		text-align: right;
	}

	tr:hover {
		background-color: var(--color-gray-050);
	}

	th {
		color: var(--color-gray-900);
		font-weight: 500;
		white-space: nowrap;
	}

	th[scope='row']::before {
		background-color: var(--indicator-color, var(--color-gray-900));
		border-radius: 1rem;
		content: '';
		display: inline-block;
		height: 0.75rem;
		margin-right: 0.25rem;
		vertical-align: middle;
		width: 0.75rem;
	}

	td {
		color: var(--color-gray-700);
		font-weight: 400;
		text-align: right;
	}

	td:hover {
		background-color: var(--color-gray-100);
	}

	.actual-values {
		--indicator-color: var(--color-gray-200);
	}
</style>
