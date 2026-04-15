<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import saveContainer from '$lib/client/saveContainer';
	import EditableTable from '$lib/components/EditableTable.svelte';
	import type {
		EditableTableDataRow,
		EditableTableSection,
		EditableTableValue
	} from '$lib/components/EditableTable.svelte';
	import {
		type ActualDataContainer,
		type Container,
		type ContainerWithEffect,
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
	import { compareState, mayCreateContainer } from '$lib/stores';
	import { statusColors } from '$lib/theme/models';
	import { _ } from 'svelte-i18n';

	interface Props {
		container: IndicatorTemplateContainer;
		editable?: boolean;
		relatedContainers?: Container[];
		comparisonContainers?: ActualDataContainer[];
		onDataChanged?: () => void;
	}

	let {
		container,
		editable = false,
		relatedContainers = [],
		comparisonContainers = [],
		onDataChanged
	}: Props = $props();

	const currentOrgUnitName = $derived(page.data.currentOrganizationalUnit?.payload.name);

	const hasComparisonData = $derived(comparisonContainers.length > 0);

	const measureStatuses = [
		status.enum['status.done'],
		status.enum['status.in_implementation'],
		status.enum['status.in_planning'],
		status.enum['status.idea']
	];

	let addingCustomActualData = $state(false);

	let actualDataContainers = $derived(
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
		actualDataContainers.find(({ payload }) => !payload.source)
	);

	let actualValuesByYear = $derived(
		actualDataContainers.map(({ payload }) => new Map(payload.values ?? []))
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

	function valuesFromMap(valuesByYear: Map<number, number>): EditableTableValue[] {
		return [...valuesByYear.entries()].map(([year, value]) => ({ year, value }));
	}

	function getMeasureValuesByYear(measure: ContainerWithEffect): EditableTableValue[] {
		const valuesByYear = new Map(
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
				.map(({ year, value }) => [year, value] as [number, number])
		);

		return valuesFromMap(valuesByYear);
	}

	let sections = $derived.by((): EditableTableSection[] => {
		const actualDataRows: EditableTableSection['rows'] = actualDataContainers.map((actualData) => ({
			id: actualData.guid,
			container: actualData,
			label: actualData.payload.source
				? hasComparisonData
					? (currentOrgUnitName ?? actualData.payload.title)
					: actualData.payload.source
				: $_('indicator.table.custom_actual_data'),

			subtitle: hasComparisonData ? actualData.payload.source : undefined,
			dotColor: actualData.payload.source ? 'var(--color-teal-600)' : 'var(--color-gray-200)',
			editable: editable && !actualData.payload.source
		}));

		if (
			editable &&
			!customActualDataContainer &&
			$mayCreateContainer(payloadTypes.enum.actual_data, container.managed_by)
		) {
			actualDataRows.push({
				type: 'action',
				id: 'add-custom-actual-data',
				label: $_('indicator.table.add_custom_actual_data'),
				onAction: addCustomActualData,
				disabled: addingCustomActualData,
				loading: addingCustomActualData
			});
		}

		const comparisonRows: EditableTableSection['rows'] = comparisonContainers.map(
			(comparisonContainer) => ({
				id: comparisonContainer.guid,
				container: comparisonContainer,
				label:
					$compareState.selectedMunicipalities.find(
						(m) => m.guid === comparisonContainer.organizational_unit
					)?.payload.name ?? comparisonContainer.payload.title,
				subtitle: comparisonContainer.payload.source,
				dotColor: `var(${
					$compareState.colorAssignments[
						comparisonContainer.organizational_unit ?? comparisonContainer.organization
					] ?? 'gray-200'
				})`,
				editable: false
			})
		);

		const goalRows: EditableTableDataRow[] = [
			{
				id: 'overall-objective',
				container,
				label: $_('indicator.table.overall_objective'),
				dotColor: 'var(--color-gray-900)',
				values: valuesFromMap(overallObjectiveByYear)
			},
			{
				id: 'objective-total',
				container,
				label: $_('indicator.table.objectives'),
				dotColor: 'var(--color-indigo-500)',
				values: valuesFromMap(objectivesByYear)
			},
			...relatedContainers.filter(isContainerWithObjective).map((objectiveContainer) => ({
				id: objectiveContainer.guid,
				container: objectiveContainer,
				label: objectiveContainer.payload.title,
				href: overlayURL(page.url, overlayKey.enum.view, objectiveContainer.guid),
				dotColor: 'var(--color-indigo-200)',
				values: valuesFromMap(
					new Map(
						findLeafObjectives(
							relatedContainers.filter(isObjectiveContainer).filter(isPartOf(objectiveContainer))
						).flatMap(({ payload }) => payload.wantedValues)
					)
				),
				indented: true
			}))
		];

		const measureRows: EditableTableDataRow[] = measureStatuses.flatMap((currentStatus) => {
			const colorName = statusColors.get(currentStatus) ?? 'gray';
			const totalValuesByYear = new Map(
				effects
					.filter((effect) => effect.status === currentStatus)
					.map(({ year, value }) => [year, value] as [number, number])
			);

			return [
				{
					id: `status-total-${currentStatus}`,
					container,
					label: $_(`indicator.table.${currentStatus}`),
					dotColor: `var(--color-${colorName}-500)`,
					values: valuesFromMap(totalValuesByYear)
				},
				...measureContainers
					.filter(({ payload }) => payload.status === currentStatus)
					.map((measure) => ({
						id: measure.guid,
						container: measure,
						label: measure.payload.title,
						href: overlayURL(page.url, overlayKey.enum.view, measure.guid),
						dotColor: `var(--color-${colorName}-200)`,
						values: getMeasureValuesByYear(measure),
						indented: true
					}))
			];
		});

		return [
			{
				heading: $_('indicator.table.actual_data'),
				rows: actualDataRows
			},
			...(hasComparisonData
				? [
						{
							heading: $_('indicator.table.comparison_data'),
							rows: comparisonRows
						}
					]
				: [
						{
							heading: $_('goals'),
							rows: goalRows
						},
						{
							heading: $_('measures'),
							rows: measureRows
						}
					])
		];
	});

	function getEntries(containerToRead: ActualDataContainer): EditableTableValue[] {
		return containerToRead.payload.values.map(([year, value]) => ({ year, value }));
	}

	function setEntry(containerToUpdate: ActualDataContainer, year: number, value: number | null) {
		if (value === null) {
			containerToUpdate.payload.values = containerToUpdate.payload.values.filter(
				([entryYear]) => entryYear !== year
			);
			return;
		}

		const entryIndex = containerToUpdate.payload.values.findIndex(
			([entryYear]) => entryYear === year
		);
		if (entryIndex > -1) {
			containerToUpdate.payload.values[entryIndex] = [year, value];
			return;
		}

		containerToUpdate.payload.values = [
			...containerToUpdate.payload.values,
			[year, value] as [number, number]
		].toSorted((a, b) => a[0] - b[0]);
	}

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
			if (!response.ok) {
				const error = await response.json();
				alert(error.message);
				return;
			}

			onDataChanged?.();
		} catch (error: unknown) {
			console.error(error);
		} finally {
			addingCustomActualData = false;
		}
	}

	async function handleSave(
		containerToSave: ActualDataContainer
	): Promise<{ guid: string; revision: number }> {
		const response = await saveContainer(containerToSave);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message);
		}

		const updatedContainer = await response.json();
		await invalidate('containers');
		return { guid: updatedContainer.guid, revision: updatedContainer.revision };
	}
</script>

<EditableTable
	title={container.payload.title}
	titleUnit={$_(container.payload.unit)}
	columnLabel={$_('table.data_object')}
	yearLabel={$_('table.in_years')}
	addYearLabel={$_('table.add_column_right')}
	variant="teal"
	{sections}
	getEntries={(containerToRead) => getEntries(containerToRead as ActualDataContainer)}
	setEntry={(containerToUpdate, year, value) =>
		setEntry(containerToUpdate as ActualDataContainer, year, value)}
	onSave={(containerToSave) => handleSave(containerToSave as ActualDataContainer)}
/>
