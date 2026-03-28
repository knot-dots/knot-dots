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
		type ActualDataContainer,
		type Container,
		containerOfType,
		findAncestors,
		findLeafObjectives,
		findOverallObjective,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isEffectContainer,
		isObjectiveContainer,
		isPartOf,
		type NewContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		status
	} from '$lib/models';
	import { statusColors } from '$lib/theme/models';

	interface Props {
		container: IndicatorTemplateContainer;
		editable?: boolean;
		relatedContainers?: Container[];
	}

	let { container, editable = false, relatedContainers = [] }: Props = $props();

	let tableContainer: HTMLDivElement;

	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
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

	let overallObjectiveByYear = $derived.by(() => {
		const overallObjective =
			findOverallObjective(container, relatedContainers)?.payload.wantedValues.map(
				([year, value]) => [year, (actualValuesByYear[0]?.get(year) ?? 0) + value]
			) ?? [];
		return new Map(overallObjective as Array<[number, number]>);
	});

	let objectivesByYear = $derived.by(() => {
		const objectives = findLeafObjectives(relatedContainers.filter(isObjectiveContainer))
			.flatMap(({ payload }) => payload.wantedValues)
			.map(([year, value]) => ({ year, value }))
			.reduce(
				(accumulator, currentValue) => {
					const groupIndex = accumulator.findIndex(({ year }) => currentValue.year == year);
					return groupIndex > -1
						? [
								...accumulator.slice(0, groupIndex),
								{
									year: currentValue.year,
									value: currentValue.value + accumulator[groupIndex].value
								},
								...accumulator.slice(groupIndex + 1)
							]
						: [
								...accumulator,
								{
									year: currentValue.year,
									value: currentValue.value
								}
							];
				},
				[] as Array<{ year: number; value: number }>
			)
			.map(({ year, value }) => [year, (actualValuesByYear[0]?.get(year) ?? 0) + value]);

		return new Map(objectives as Array<[number, number]>);
	});

	let effectContainers = $derived(relatedContainers.filter(isEffectContainer));

	let measureContainers = $derived(relatedContainers.filter(isContainerWithEffect));

	let effects = $derived.by(() => {
		return effectContainers
			.map((c) => {
				const measure = findAncestors(c, relatedContainers, [
					predicates.enum['is-part-of'],
					predicates.enum['is-part-of-measure']
				]).find(isContainerWithEffect);

				if (!measure) {
					return {
						values: []
					};
				}

				switch (measure.payload.status) {
					case status.enum['status.done']:
						return {
							values: c.payload.achievedValues.map(([year, value]) => ({
								year,
								value,
								status: measure.payload.status
							}))
						};
					case status.enum['status.in_implementation']:
						return {
							values: c.payload.plannedValues.map(([year, value], index) => ({
								year,
								value: c.payload.achievedValues[index]
									? value - c.payload.achievedValues[index][1]
									: value,
								status: measure.payload.status
							}))
						};
					case status.enum['status.rejected']:
						return {
							values: c.payload.plannedValues.map(([year]) => ({
								year,
								value: 0,
								status: measure.payload.status
							}))
						};
					default:
						return {
							values: c.payload.plannedValues.map(([year, value]) => ({
								year: year,
								value: value,
								status: measure.payload.status
							}))
						};
				}
			})
			.flatMap(({ values }) => values)
			.reduce(
				(accumulator, currentValue) => {
					const groupIndex = accumulator.findIndex(
						({ status, year }) => currentValue.status == status && currentValue.year == year
					);
					return groupIndex > -1
						? [
								...accumulator.slice(0, groupIndex),
								{
									status: currentValue.status,
									year: currentValue.year,
									value: currentValue.value + accumulator[groupIndex].value
								},
								...accumulator.slice(groupIndex + 1)
							]
						: [
								...accumulator,
								{
									status: currentValue.status,
									year: currentValue.year,
									value: currentValue.value
								}
							];
				},
				[] as Array<{ year: number; value: number; status: string }>
			);
	});

	let years = $derived(
		Array.from(
			new Set([
				...actualValuesByYear.flatMap((m) => [...m.keys()]),
				...objectivesByYear.keys(),
				...effects.map(({ year }) => year)
			])
		).toSorted()
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
		) as Omit<NewContainer, 'payload'> & Pick<ActualDataContainer, 'payload'>;

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

	function append(container: ActualDataContainer) {
		return async () => {
			container.payload.values = [...container.payload.values, [Math.max(...years) + 1, 0]];
			await tick();
			tableContainer?.scrollTo({ left: tableContainer.scrollWidth, behavior: 'instant' });
		};
	}

	function prepend(container: ActualDataContainer) {
		return () => {
			container.payload.values = [
				[years.length ? Math.min(...years) - 1 : new Date().getFullYear(), 0],
				...container.payload.values
			];
		};
	}
</script>

{#snippet cells(header: { href?: string; text: string }, valuesByYear: Map<number, number>)}
	<th class="truncated" scope="row">
		{#if header.href}
			<a href={header.href}>{header.text}</a>
		{:else}
			{header.text}
		{/if}
	</th>

	{#if editable && customActualDataContainer}
		<td class="control control--prepend"></td>
	{/if}

	{#each years as year (year)}
		<td class="data">{valuesByYear.get(year) ?? ''}</td>
	{/each}

	{#if editable && customActualDataContainer && years.length > 0}
		<td></td>
	{/if}
{/snippet}

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
					<th scope="col" class="data">{year}</th>
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
				<tr
					style:--indicator-color={actualDataContainer[i].payload.source
						? 'var(--color-teal-600)'
						: 'var(--color-gray-200)'}
				>
					<th class="truncated" scope="row">
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

		<tbody>
			<tr>
				<th
					colspan={editable
						? years.length + 1 + (customActualDataContainer ? Math.max(years.length + 1, 2) : 0)
						: years.length + 1}
					scope="col">{$_('goals')}</th
				>
			</tr>

			<tr class="overall-objective">
				{@render cells({ text: $_('indicator.table.overall_objective') }, overallObjectiveByYear)}
			</tr>

			<tr class="objective-total" style:--indicator-color="var(--color-indigo-500)">
				{@render cells({ text: $_('indicator.table.objectives') }, objectivesByYear)}
			</tr>

			{#each relatedContainers.filter(isContainerWithObjective) as containerWithObjective (containerWithObjective.guid)}
				{@const valuesByYear = new Map(
					findLeafObjectives(
						relatedContainers.filter(isObjectiveContainer).filter(isPartOf(containerWithObjective))
					).flatMap(({ payload }) => payload.wantedValues)
				)}
				<tr class="objective" style:--indicator-color="var(--color-indigo-200)">
					{@render cells(
						{
							href: overlayURL(page.url, overlayKey.enum.view, containerWithObjective.guid),
							text: containerWithObjective.payload.title
						},
						valuesByYear
					)}
				</tr>
			{/each}
		</tbody>

		<tbody>
			<tr>
				<th
					colspan={editable
						? years.length + 1 + (customActualDataContainer ? Math.max(years.length + 1, 2) : 0)
						: years.length + 1}
					scope="col">{$_('measures')}</th
				>
			</tr>

			{#each [status.enum['status.done'], status.enum['status.in_implementation'], status.enum['status.in_planning'], status.enum['status.idea']] as currentStatus (currentStatus)}
				{@const totalValuesByYear = new Map(
					effects.filter((e) => e.status === currentStatus).map(({ year, value }) => [year, value])
				)}

				{@const indicatorColor = statusColors.get(currentStatus) ?? 'gray'}

				<tr class="effect-total" style="--indicator-color: var(--color-{indicatorColor}-500)">
					{@render cells({ text: $_(`indicator.table.${currentStatus}`) }, totalValuesByYear)}
				</tr>

				{#each measureContainers.filter(({ payload }) => payload.status === currentStatus) as measure (measure.guid)}
					{@const valuesByYear = new Map(
						effectContainers
							.filter((c) =>
								findAncestors(c, relatedContainers, [
									predicates.enum['is-part-of'],
									predicates.enum['is-part-of-measure']
								]).some(({ guid }) => guid === measure.guid)
							)
							.map(({ payload }) => {
								switch (measure.payload.status) {
									case status.enum['status.done']:
										return {
											values: payload.achievedValues.map(([year, value]) => ({
												year: year,
												value: value
											}))
										};
									case status.enum['status.in_implementation']:
										return {
											values: payload.plannedValues.map(([year, value], index) => ({
												year: year,
												value: payload.achievedValues[index]
													? value - payload.achievedValues[index][1]
													: value
											}))
										};
									case status.enum['status.rejected']:
										return {
											values: payload.plannedValues.map(([year]) => ({
												year,
												value: 0
											}))
										};
									default:
										return {
											values: payload.plannedValues.map(([year, value]) => ({
												year: year,
												value: value
											}))
										};
								}
							})
							.flatMap(({ values }) => values)
							.reduce(
								(accumulator, currentValue) => {
									const groupIndex = accumulator.findIndex(({ year }) => currentValue.year == year);
									return groupIndex > -1
										? [
												...accumulator.slice(0, groupIndex),
												{
													year: currentValue.year,
													value: currentValue.value + accumulator[groupIndex].value
												},
												...accumulator.slice(groupIndex + 1)
											]
										: [
												...accumulator,
												{
													year: currentValue.year,
													value: currentValue.value
												}
											];
								},
								[] as Array<{ year: number; value: number }>
							)
							.map(({ year, value }) => [year, value])
					)}
					<tr class="effect" style="--indicator-color: var(--color-{indicatorColor}-200)">
						{@render cells(
							{
								href: overlayURL(page.url, overlayKey.enum.view, measure.guid),
								text: measure.payload.title
							},
							valuesByYear
						)}
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>

<style>
	button {
		white-space: nowrap;
	}

	div {
		margin-left: var(--editable-table-margin-left, 0);
		margin-right: var(--editable-table-margin-right, 0);
		margin-top: 1.25rem;
		overflow: auto;
		padding-left: calc(var(--editable-table-margin-left) * -1);
		padding-right: 1rem;
	}

	table {
		border: solid 1px var(--color-gray-200);
		width: fit-content;
	}

	td,
	th {
		border: solid 1px var(--color-gray-200);
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: nowrap;
	}

	thead th {
		background-color: var(--color-teal-100);
		border-color: var(--color-teal-200);
		color: var(--color-teal-900);
		font-weight: 400;
	}

	tbody th[scope='col'] {
		background-color: var(--color-gray-025);
		color: var(--color-gray-600);
		font-weight: 500;
	}

	tbody th[scope='row'] {
		color: var(--color-gray-800);
		font-weight: 500;
		max-width: 18.75rem;
	}

	tbody th[scope='row']::before {
		--diameter: 0.75rem;

		background-color: var(--indicator-color);
		border-radius: 50%;
		content: '';
		display: inline-block;
		height: var(--diameter);
		margin-left: 0.5rem;
		margin-right: 0.375rem;
		vertical-align: -1px;
		width: var(--diameter);
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

	.effect th,
	.objective th {
		padding-left: 1rem;
	}

	.objective {
		--indicator-color: var(--color-indigo-200);
	}

	.objective-total {
		--indicator-color: var(--color-indigo-500);
	}

	.overall-objective {
		--indicator-color: var(--color-gray-900);
	}
</style>
