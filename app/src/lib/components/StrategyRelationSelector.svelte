<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		isMeasureContainer,
		isModelContainer,
		isOperationalGoalContainer,
		isSimpleMeasureContainer,
		isStrategicGoalContainer,
		isVisionContainer,
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

	let allowedSuperordinateTypes = [
		payloadTypes.enum.model,
		payloadTypes.enum.vision,
		payloadTypes.enum.strategic_goal,
		payloadTypes.enum.measure_result,
		payloadTypes.enum.operational_goal,
		payloadTypes.enum.measure
	];

	if (isStrategicGoalContainer(container)) {
		allowedSuperordinateTypes = [payloadTypes.enum.model, payloadTypes.enum.vision];
	} else if (isOperationalGoalContainer(container)) {
		allowedSuperordinateTypes = [
			payloadTypes.enum.model,
			payloadTypes.enum.vision,
			payloadTypes.enum.strategic_goal
		];
	} else if (isMeasureContainer(container) || isSimpleMeasureContainer(container)) {
		allowedSuperordinateTypes = [
			payloadTypes.enum.model,
			payloadTypes.enum.vision,
			payloadTypes.enum.strategic_goal,
			payloadTypes.enum.operational_goal
		];
	}

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

		if (strategyRevision && !isModelContainer(container) && !isVisionContainer(container)) {
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
			)
			.concat(
				paramsFromURL($page.url)
					.getAll('is-part-of-strategy')
					.map(
						(o): PartialRelation => ({
							object: Number(o),
							position: parseInt(paramsFromURL($page.url).get('position') ?? '0'),
							predicate: 'is-part-of-strategy'
						})
					)
			);

		if (isModelContainer(container) || isVisionContainer(container)) {
			const isPartOfStrategyIndex = container.relation.findIndex(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-part-of-strategy'] &&
					('revision' in container ? subject == container.revision : true)
			);

			if (isPartOfStrategyIndex > -1) {
				container.relation = [
					...container.relation,
					{
						...container.relation[isPartOfStrategyIndex],
						predicate: predicates.enum['is-part-of']
					}
				];
			}
		}
	}

	function onChangeIsPartOfStrategy(event: Event) {
		const isPartOfStrategyIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-strategy'] &&
				('revision' in container ? subject == container.revision : true)
		);
		const value = (event as CustomEvent).detail.selected.value;

		container.relation = [
			...container.relation.slice(0, isPartOfStrategyIndex),
			...(value
				? [
						{
							object: parseInt(value),
							position: 0,
							predicate: predicates.enum['is-part-of-strategy'],
							...('revision' in container ? { subject: container.revision } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfStrategyIndex + 1)
		];

		if (
			container.payload.type === payloadTypes.enum.model ||
			container.payload.type === payloadTypes.enum.vision
		) {
			const isPartOfIndex = container.relation.findIndex(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-part-of'] &&
					('revision' in container ? subject == container.revision : true)
			);
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
		} else {
			isPartOfOptionsRequest = fetchContainers({
				isPartOfStrategy: [parseInt(value)],
				payloadType: allowedSuperordinateTypes
			});
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

{#await isPartOfStrategyOptionsRequest then strategyContainers}
	<ListBox
		label={$_('strategy')}
		options={[
			{ value: undefined, label: $_('not_part_of_strategy') },
			...strategyContainers.map(({ payload, revision }) => ({
				value: revision,
				label: payload.title
			}))
		]}
		value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of-strategy'])
			?.object}
		on:change={onChangeIsPartOfStrategy}
	/>
{/await}

{#await isPartOfOptionsRequest then isPartOfOptions}
	{#if isPartOfOptions.length > 0}
		{@const options = [
			{ value: undefined, label: $_('not_part_of') },
			...isPartOfOptions
				.filter((c) => isModelContainer(c) || isVisionContainer(c))
				.map(({ payload, revision }) => ({
					value: revision,
					label: payload.title,
					group: $_('payload_group.long_term_goals')
				})),
			...isPartOfOptions.filter(isStrategicGoalContainer).map(({ payload, revision }) => ({
				value: revision,
				label: payload.title,
				group: $_('payload_group.strategic_goals')
			})),
			...isPartOfOptions.filter(isOperationalGoalContainer).map(({ payload, revision }) => ({
				value: revision,
				label: payload.title,
				group: $_('payload_group.measurable_goals')
			})),
			...isPartOfOptions.filter(isMeasureContainer).map(({ payload, revision }) => ({
				value: revision,
				label: payload.title,
				group: $_('payload_group.implementation')
			}))
		]}
		<ListBox
			label={$_('superordinate_element')}
			{options}
			value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])?.object}
			on:change={onChangeIsPartOf}
		/>
	{/if}
{/await}
