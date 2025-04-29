<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		type Container,
		type EmptyContainer,
		isGoalContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		isTaskContainer,
		type MeasureContainer,
		type PartialRelation,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: Container | EmptyContainer;

	let isPartOfOptionsRequest: Promise<Container[]> = new Promise(() => []);
	let isPartOfMeasureOptionsRequest: Promise<MeasureContainer[]> = new Promise(() => []);

	function createIsPartOfOptionsRequest(
		container: Container | EmptyContainer
	): Promise<Container[]> {
		const measureRevision = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		)?.object;

		if (isMilestoneContainer(container) && measureRevision) {
			return fetchContainers({
				isPartOfMeasure: [measureRevision],
				payloadType: [payloadTypes.enum.measure_result]
			}) as Promise<Container[]>;
		} else if (isTaskContainer(container)) {
			if (measureRevision) {
				return fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result, payloadTypes.enum.milestone]
				}) as Promise<Container[]>;
			} else {
				return fetchContainers({
					organization: [container.organization],
					organizationalUnit: container.organizational_unit ? [container.organizational_unit] : [],
					payloadType: [payloadTypes.enum.goal]
				}) as Promise<Container[]>;
			}
		}

		return new Promise(() => []);
	}

	onMount(() => {
		isPartOfMeasureOptionsRequest = fetchContainers({
			organization: [container.organization],
			...(container.organizational_unit
				? { organizationalUnit: [container.organizational_unit] }
				: undefined),
			payloadType: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
		}) as Promise<MeasureContainer[]>;

		isPartOfOptionsRequest = createIsPartOfOptionsRequest(container);
	});

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: o,
					position: 0,
					predicate: 'is-part-of'
				})
			)
			.concat(
				paramsFromURL($page.url)
					.getAll('is-part-of-measure')
					.map(
						(o): PartialRelation => ({
							object: o,
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
				('guid' in container ? subject == container.guid : true)
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
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-measure'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfMeasureIndex + 1)
		];

		isPartOfOptionsRequest = createIsPartOfOptionsRequest(container);
	}

	function onChangeIsPartOf(event: Event) {
		if ((event as CustomEvent).detail.selected == undefined) {
			return;
		}

		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('guid' in container ? subject == container.guid : true)
		);
		const value = (event as CustomEvent).detail.selected.value;

		container.relation = [
			...container.relation.slice(0, isPartOfIndex),
			...(value
				? [
						{
							object: (event as CustomEvent).detail.selected.value,
							position: 0,
							predicate: predicates.enum['is-part-of'],
							...('guid' in container ? { subject: container.guid } : undefined)
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
					...measureContainers.map(({ payload, guid }) => ({
						value: guid,
						label: payload.title
					}))
				]}
				value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of-measure'])
					?.object}
				onChange={onChangeIsPartOfMeasure}
			/>
		</div>
	</div>
{/await}

{#if isTaskContainer(container) || isMilestoneContainer(container)}
	{#await isPartOfOptionsRequest then isPartOfOptions}
		{#if isPartOfOptions.length > 0}
			{@const options = [
				{ value: undefined, label: $_('not_part_of') },
				...isPartOfOptions
					.filter((c) => isGoalContainer(c))
					.map(({ payload, guid }) => ({
						value: guid,
						label: payload.title,
						group: $_('payload_group.goals')
					})),
				...isPartOfOptions.filter(isMeasureResultContainer).map(({ payload, guid }) => ({
					value: guid,
					label: payload.title,
					group: $_('measure_results')
				})),
				...isPartOfOptions.filter(isMilestoneContainer).map(({ payload, guid }) => ({
					value: guid,
					label: payload.title,
					group: $_('milestones')
				}))
			]}
			<div class="meta">
				<p class="meta-key">{$_('superordinate_element')}</p>
				<div class="meta-value">
					<ListBox
						{options}
						value={container.relation.find(
							(r) =>
								r.predicate === predicates.enum['is-part-of'] &&
								('guid' in container ? r.subject === container.guid : true)
						)?.object}
						onChange={onChangeIsPartOf}
					/>
				</div>
			</div>
		{/if}
	{/await}
{/if}
