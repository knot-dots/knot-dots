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
			payloadType: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
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

	async function onChangeIsPartOfMeasure(event: Event) {
		if ((event as CustomEvent).detail.selected == undefined) {
			return;
		}

		const isPartOfMeasureIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				('revision' in container ? subject == container.revision : true)
		);
		const value = (event as CustomEvent).detail.selected.value;

		const isPartOfMeasureOptions = await isPartOfMeasureOptionsRequest;

		container.managed_by =
			isPartOfMeasureOptions.find(({ revision }) => revision == value)?.managed_by ??
			container.organizational_unit ??
			container.organization;
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
	}

	function onChangeIsPartOf(event: Event) {
		if ((event as CustomEvent).detail.selected == undefined) {
			return;
		}

		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('revision' in container ? subject == container.revision : true)
		);
		const value = (event as CustomEvent).detail.selected.value;

		container.relation = [
			...container.relation.slice(0, isPartOfIndex),
			...(value
				? [
						{
							object: parseInt((event as CustomEvent).detail.selected.value),
							position: 0,
							predicate: predicates.enum['is-part-of'],
							...('revision' in container ? { subject: container.revision } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfIndex + 1)
		];
	}
</script>

{#await isPartOfMeasureOptionsRequest then measureContainers}
	<div class="meta">
		<p class="meta-key">{$_('measure')}</p>
		<div class="meta-value">
			<ListBox
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
		</div>
	</div>
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
			<div class="meta">
				<p class="meta-key">{$_('superordinate_element')}</p>
				<div class="meta-value">
					<ListBox
						{options}
						value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])
							?.object}
						on:change={onChangeIsPartOf}
					/>
				</div>
			</div>
		{/if}
	{/await}
{/if}
