<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		computeColumnTitleForGoals,
		type GoalContainer,
		goalsByHierarchyLevel,
		isGoalContainer,
		isMeasureContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import type {
		AnyContainer,
		EmptyContainer,
		StrategyContainer,
		PartialRelation
	} from '$lib/models';

	export let container: AnyContainer | EmptyContainer;

	let isPartOfOptionsRequest: Promise<AnyContainer[]> = new Promise(() => []);
	let isPartOfStrategyOptionsRequest: Promise<StrategyContainer[]> = new Promise(() => []);

	const allowedSuperordinateTypes = [payloadTypes.enum.goal];

	onMount(() => {
		isPartOfStrategyOptionsRequest = fetchContainers({
			organization: [container.organization],
			...(container.organizational_unit
				? { organizationalUnit: [container.organizational_unit] }
				: undefined),
			payloadType: [payloadTypes.enum.strategy]
		}) as Promise<StrategyContainer[]>;

		const strategyRevision = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
		)?.object;

		if (strategyRevision) {
			isPartOfOptionsRequest = fetchContainers({
				isPartOfStrategy: [strategyRevision],
				payloadType: allowedSuperordinateTypes
			});
		}
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
					.getAll('is-part-of-strategy')
					.map(
						(o): PartialRelation => ({
							object: o,
							position: parseInt(paramsFromURL($page.url).get('position') ?? '0'),
							predicate: 'is-part-of-strategy'
						})
					)
			);
	}

	async function onChangeIsPartOfStrategy(event: Event) {
		if ((event as CustomEvent).detail.selected == undefined) {
			return;
		}

		const isPartOfStrategyIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-strategy'] &&
				('guid' in container ? subject == container.guid : true)
		);
		const value = (event as CustomEvent).detail.selected.value;

		if (isPartOfStrategyIndex > -1 && value === container.relation[isPartOfStrategyIndex].object) {
			return;
		}

		const isPartOfStrategyOptions = await isPartOfStrategyOptionsRequest;

		container.managed_by =
			isPartOfStrategyOptions.find(({ guid }) => guid == value)?.managed_by ??
			container.organizational_unit ??
			container.organization;
		container.relation = [
			...container.relation.slice(0, isPartOfStrategyIndex),
			...(value
				? [
						{
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-strategy'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfStrategyIndex + 1)
		];

		if (value) {
			isPartOfOptionsRequest = fetchContainers({
				isPartOfStrategy: [value],
				payloadType: allowedSuperordinateTypes
			});
		}
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

{#await isPartOfStrategyOptionsRequest then strategyContainers}
	<div class="meta">
		<p class="meta-key">{$_('strategy')}</p>
		<div class="meta-value">
			<ListBox
				options={[
					{ value: undefined, label: $_('not_part_of_strategy') },
					...strategyContainers.map(({ payload, guid }) => ({
						value: guid,
						label: payload.title
					}))
				]}
				value={container.relation.find(
					(r) => r.predicate === predicates.enum['is-part-of-strategy']
				)?.object}
				onChange={onChangeIsPartOfStrategy}
			/>
		</div>
	</div>
{/await}

{#await isPartOfOptionsRequest then isPartOfOptions}
	{#if isPartOfOptions.length > 0}
		{@const goals = goalsByHierarchyLevel(
			isPartOfOptions
				.filter(isGoalContainer)
				.filter(({ guid }) => !('guid' in container) || guid !== container.guid)
				.filter(({ relation }) =>
					relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-strategy'])
				)
		)}
		{@const options = [
			{ value: undefined, label: $_('not_part_of') },
			...Array.from(goals.values())
				.toSorted()
				.flatMap((containers) =>
					containers.map((container: GoalContainer) => ({
						value: container.guid,
						label: container.payload.title,
						group: computeColumnTitleForGoals(containers)
					}))
				),
			...isPartOfOptions.filter(isMeasureContainer).map(({ payload, guid }) => ({
				value: guid,
				label: payload.title,
				group: $_('payload_group.implementation')
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
