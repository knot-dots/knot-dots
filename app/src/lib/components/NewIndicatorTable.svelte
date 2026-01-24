<script lang="ts">
	import { tick } from 'svelte';
	import { _, number } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import tooltip from '$lib/attachments/tooltip';
	import saveContainer from '$lib/client/saveContainer';
	import {
		type ActualDataPayload,
		type Container,
		containerOfType,
		type IndicatorTemplatePayload,
		isContainerWithPayloadType,
		type NewContainer,
		payloadTypes
	} from '$lib/models';

	interface Props {
		container: Container<IndicatorTemplatePayload>;
		editable?: boolean;
		relatedContainers?: Container[];
	}

	let { container, editable = false, relatedContainers = [] }: Props = $props();

	let tableContainer: HTMLDivElement;

	let actualDataContainer = $derived(
		relatedContainers
			.filter((container) => isContainerWithPayloadType(payloadTypes.enum.actual_data, container))
			.filter(({ payload }) => payload.indicator === container.guid)
			.toSorted((a, b) => (a.payload.source ? (b.payload.source ? 0 : -1) : 1))
			.map((c) => {
				let _ = $state(c);
				return _;
			})
	);

	let customActualDataContainer = $derived(
		actualDataContainer.find(({ payload }) => !payload.source)
	);

	let actualValuesByYear = $derived(
		actualDataContainer.map(({ payload }) => new Map(payload.values ?? []))
	);

	let years = $derived(
		Array.from(new Set(actualValuesByYear.flatMap((m) => [...m.keys()]))).toSorted()
	);

	let addingCustomActualData = $state(false);

	async function addCustomActualData() {
		addingCustomActualData = true;

		const newActualDataContainer = containerOfType(
			payloadTypes.enum.actual_data,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer<ActualDataPayload>;

		newActualDataContainer.payload = {
			...newActualDataContainer.payload,
			indicator: container.guid,
			title: container.payload.title,
			values: []
		};

		try {
			const response = await saveContainer(newActualDataContainer);
			if (response.ok) {
				let _ = $state(await response.json());
				actualDataContainer = [...actualDataContainer, _];
			} else {
				const error = await response.json();
				alert(error.message);
			}
		} catch (error: unknown) {
			console.error(error);
		} finally {
			addingCustomActualData = false;
		}
	}

	function updateCustomActualData(container: Container<ActualDataPayload>, year: number) {
		let timer: ReturnType<typeof setTimeout>;

		return async (event: Event) => {
			event.stopPropagation();

			const value = (event.currentTarget as HTMLInputElement).value.replace(',', '.');

			clearTimeout(timer);

			timer = setTimeout(async () => {
				const index = container.payload.values.findIndex(([y]) => y == year);
				if (index > -1) {
					container.payload.values[index] = [year, parseFloat(value)];
				} else {
					container.payload.values.push([year, parseFloat(value)]);
					container.payload.values = container.payload.values.toSorted((a, b) => a[0] - b[0]);
				}

				const response = await saveContainer(container);
				if (response.ok) {
					const updatedContainer = await response.json();
					container.revision = updatedContainer.revision;
					await invalidate('containers');
				} else {
					const error = await response.json();
					alert(error.message);
				}
			}, 2000);
		};
	}

	function append(container: Container<ActualDataPayload>) {
		return async () => {
			container.payload.values = [...container.payload.values, [Math.max(...years) + 1, 0]];
			await tick();
			tableContainer?.scrollTo({ left: tableContainer.scrollWidth, behavior: 'instant' });
		};
	}

	function prepend(container: Container<ActualDataPayload>) {
		return () => {
			container.payload.values = [
				[years.length ? Math.min(...years) - 1 : new Date().getFullYear(), 0],
				...container.payload.values
			];
		};
	}
</script>

<div bind:this={tableContainer}>
	<table>
		<thead>
			<tr>
				<th>&nbsp;</th>
				{#if editable && customActualDataContainer}
					<th class="control control--prepend">
						<button
							{@attach tooltip($_('indicator.table.add_column'))}
							class="action-button action-button--size-s action-button--padding-tight"
							onclick={prepend(customActualDataContainer)}
							type="button"
						>
							<Plus />
						</button>
					</th>
				{/if}

				{#each years as year (year)}
					<th class="data">{year}</th>
				{/each}

				{#if editable && customActualDataContainer && years.length > 0}
					<th class="control">
						<button
							{@attach tooltip($_('indicator.table.add_column'))}
							class="action-button action-button--size-s action-button--padding-tight"
							onclick={append(customActualDataContainer)}
							type="button"
						>
							<Plus />
						</button>
					</th>
				{/if}
			</tr>
		</thead>

		<tbody>
			<tr>
				<th
					colspan={editable
						? years.length + 1 + (customActualDataContainer ? Math.max(years.length + 1, 2) : 0)
						: years.length + 1}
					scope="col"
				>
					{$_('indicator.table.actual_data')}
				</th>
			</tr>

			{#each actualValuesByYear as valuesByYear, i (i)}
				<tr>
					<th scope="row">
						{#if actualDataContainer[i].payload.source}
							{actualDataContainer[i].payload.source}
						{:else}
							{$_('indicator.table.custom_actual_data')}
						{/if}
					</th>

					{#if editable && customActualDataContainer}
						<td class="control control--prepend"></td>
					{/if}

					{#each years as year (year)}
						<td class="data">
							{#if editable && !actualDataContainer[i].payload.source}
								<input
									inputmode="decimal"
									oninput={updateCustomActualData(actualDataContainer[i], year)}
									type="text"
									value={valuesByYear.has(year)
										? $number(valuesByYear.get(year)!, { style: 'decimal', useGrouping: false })
										: ''}
								/>
							{:else}
								{valuesByYear.has(year)
									? $number(valuesByYear.get(year)!, { style: 'decimal', useGrouping: false })
									: ''}
							{/if}
						</td>
					{/each}

					{#if editable && customActualDataContainer && years.length > 0}
						<td></td>
					{/if}
				</tr>
			{/each}

			{#if editable && !customActualDataContainer}
				<tr>
					<td colspan={years.length + 1}>
						<button disabled={addingCustomActualData} onclick={addCustomActualData} type="button">
							{#if addingCustomActualData}
								<span class="loader"></span>
							{:else}
								<Plus />
								{$_('indicator.table.add_custom_actual_data')}
							{/if}
						</button>
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
	button {
		white-space: nowrap;
	}

	div {
		overflow-x: scroll;
		padding: 0 0 1px;
	}

	table {
		border: solid 1px var(--color-gray-200);
		width: fit-content;
	}

	thead {
		background-color: var(--color-gray-100);
	}

	td,
	th {
		border: solid 1px var(--color-gray-200);
		padding: 0.75rem 0.5rem;
	}

	th {
		white-space: nowrap;
	}

	thead th {
		border-top: none;
		color: var(--color-gray-700);
		font-weight: 400;
		padding: 0.5rem;
	}

	tbody th[scope='col'] {
		background-color: var(--color-gray-025);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	tbody th[scope='row'] {
		background-color: var(--color-white);
		color: var(--color-gray-800);
		font-weight: 500;
	}

	tbody td {
		background: var(--color-white);
	}

	td:has(input) {
		padding: 0;
	}

	input {
		background-color: transparent;
		border: none;
		border-radius: 0;
		display: block;
		field-sizing: content;
		line-height: 1.5;
		padding: 0.75rem 0.5rem;
		text-align: right;
	}

	.control {
		min-width: 2.5rem;
		width: 2.5rem;
	}

	.control--prepend {
		border-left: none;
	}

	th:has(+ .control--prepend) {
		border-right: none;
	}

	.data {
		text-align: right;
	}
</style>
