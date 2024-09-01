<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		type AnyContainer,
		type EmptyContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		isTaskContainer,
		type MeasureContainer,
		type PartialRelation,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: AnyContainer | EmptyContainer;

	let isPartOfOptionsRequest: Promise<AnyContainer[]> = new Promise(() => []);
	let isPartOfMeasureOptionsRequest: Promise<MeasureContainer[]> = new Promise(() => []);

	onMount(() => {
		isPartOfMeasureOptionsRequest = fetchContainers({
			organization: [container.organization],
			...(container.organizational_unit
				? { organizationalUnit: [container.organizational_unit] }
				: undefined),
			payloadType: [payloadTypes.enum.measure]
		}) as Promise<MeasureContainer[]>;

		const measureRevision = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		)?.object;

		if (isMilestoneContainer(container)) {
			if (measureRevision) {
				isPartOfOptionsRequest = fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result]
				});
			}
		} else if (isTaskContainer(container)) {
			if (measureRevision) {
				isPartOfOptionsRequest = fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result, payloadTypes.enum.milestone]
				});
			}
		}
	});

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of'
				})
			)
			.concat(
				paramsFromURL($page.url)
					.getAll('is-part-of-measure')
					.map(
						(o): PartialRelation => ({
							object: Number(o),
							position: 0,
							predicate: 'is-part-of-measure'
						})
					)
			);
	}

	function onChangeIsPartOfMeasure(event: Event) {
		const isPartOfMeasureIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				('revision' in container ? subject == container.revision : true)
		);
		const value = (event as CustomEvent).detail.selected.value;

		container.relation = [
			...container.relation.slice(0, isPartOfMeasureIndex),
			...(value
				? [
						{
							object: parseInt(value),
							position: 0,
							predicate: predicates.enum['is-part-of-measure'],
							...('revision' in container ? { subject: container.revision } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfMeasureIndex + 1)
		];

		if (container.payload.type === payloadTypes.enum.task) {
			const isPartOfIndex = container.relation.findIndex(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-part-of'] &&
					('revision' in container ? subject == container.revision : true)
			);
			container.relation = [
				...container.relation.slice(0, isPartOfIndex),
				{
					object: parseInt(value),
					position: 0,
					predicate: predicates.enum['is-part-of'],
					...('revision' in container ? { subject: container.revision } : undefined)
				},
				...container.relation.slice(isPartOfIndex + 1)
			];
		}
	}

	function onChangeIsPartOf(event: Event) {
		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('revision' in container ? subject == container.revision : true)
		);

		container.relation = [
			...container.relation.slice(0, isPartOfIndex),
			{
				object: parseInt((event as CustomEvent).detail.selected.value),
				position: 0,
				predicate: predicates.enum['is-part-of'],
				...('revision' in container ? { subject: container.revision } : undefined)
			},
			...container.relation.slice(isPartOfIndex + 1)
		];
	}
</script>

{#await isPartOfMeasureOptionsRequest then measureContainers}
	<ListBox
		label={$_('measure')}
		options={[
			{ value: undefined, label: $_('not_part_of_measure') },
			...measureContainers.map(({ payload, revision }) => ({
				value: revision,
				label: payload.title
			}))
		]}
		value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of-measure'])
			?.object}
		on:change={onChangeIsPartOfMeasure}
	/>
{/await}

{#if isTaskContainer(container) || isMilestoneContainer(container)}
	{#await isPartOfOptionsRequest then isPartOfOptions}
		{#if isPartOfOptions.length > 0}
			{@const options = [
				{ value: undefined, label: $_('not_part_of') },
				...isPartOfOptions.filter(isMeasureResultContainer).map(({ payload, revision }) => ({
					value: revision,
					label: payload.title,
					group: $_('measure_results')
				})),
				...isPartOfOptions.filter(isMilestoneContainer).map(({ payload, revision }) => ({
					value: revision,
					label: payload.title,
					group: $_('milestones')
				}))
			]}
			<ListBox
				label={$_('superordinate_element')}
				{options}
				value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])
					?.object}
				on:change={onChangeIsPartOf}
			/>
		{/if}
	{/await}
{/if}
