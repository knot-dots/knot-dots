<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import { env } from '$env/dynamic/public';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import {
		type ActualDataContainer,
		type Container,
		containerOfType,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		type NewContainer,
		payloadTypes
	} from '$lib/models';

	interface Props {
		container: IndicatorTemplateContainer;
		editable?: boolean;
		relatedContainers?: Container[];
	}

	let { container, editable = false, relatedContainers = [] }: Props = $props();

	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
			.filter(({ payload }) => payload.indicator === container.guid)
			.toSorted((a, b) => (a.payload.source ? (b.payload.source ? 0 : -1) : 1))
	);

	let actualValuesByYear = $derived(
		actualDataContainer.map(({ payload }) => new Map(payload.values ?? []))
	);

	let years = $derived(Array.from(new Set(...actualValuesByYear.flatMap((m) => m.keys()))));

	async function addCustomActualData() {
		const newActualDataContainer = containerOfType(
			payloadTypes.enum.actual_data,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer & Pick<ActualDataContainer, 'payload'>;

		newActualDataContainer.payload = {
			...newActualDataContainer.payload,
			indicator: container.guid,
			title: container.payload.title,
			values: []
		};

		try {
			const response = await saveContainer(newActualDataContainer);
			if (response.ok) {
				actualDataContainer.push(await response.json());
			} else {
				const error = await response.json();
				alert(error.message);
			}
		} catch (error: unknown) {
			console.error(error);
		}
	}

	function updateCustomActualData(container: ActualDataContainer, year: number) {
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
</script>

{#if actualDataContainer}
	<div>
		<table>
			{#if actualDataContainer.some(({ payload }) => payload.source)}
				<caption>
					{#each actualDataContainer as container, i}
						{#if container.payload.source}
							<sup>{i + 1}</sup> {$_('indicator.source')}: {container.payload.source}
						{/if}
					{/each}
				</caption>
			{/if}

			<thead>
				<tr>
					<th></th>
					{#each years as year}
						<th>{year}</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each actualValuesByYear as valuesByYear, i}
					<tr class="actual-values">
						<th scope="row">
							{$_('indicator.table.actual_values')}
							{#if actualDataContainer[i].payload.source}
								<sup>{i + 1}</sup>
							{/if}
						</th>
						{#each years as year}
							<td>
								{#if editable && !actualDataContainer[i].payload.source}
									<input
										inputmode="decimal"
										oninput={updateCustomActualData(actualDataContainer[i], year)}
										type="text"
										value={valuesByYear.has(year) ? $number(valuesByYear.get(year)!) : ''}
									/>
								{:else}
									{valuesByYear.has(year) ? $number(valuesByYear.get(year)!) : ''}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>

		{#if editable}
			<p>
				{#if actualDataContainer.some(({ payload }) => payload.source) && actualDataContainer.length == 1}
					<button onclick={addCustomActualData} type="button">
						{$_('indicator.add_custom_actual_data')}
					</button>
				{/if}
			</p>
		{/if}
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

	td:has(input) {
		padding: 0;
	}

	.actual-values {
		--indicator-color: var(--color-gray-200);
	}

	input {
		background-color: transparent;
		border: none;
		border-radius: 0;
		display: block;
		line-height: 1.5;
		padding: 0.75rem 0.5rem;
		text-align: right;
		width: 100%;
	}
</style>
