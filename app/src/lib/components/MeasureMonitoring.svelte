<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		containersByHierarchyLevel,
		type Container,
		type EffectPayload,
		type GoalPayload,
		type IndicatorPayload,
		isContainerWithPayloadType,
		isPartOf,
		type MeasurePayload,
		overlayKey,
		payloadTypes,
		predicates,
		type SimpleMeasurePayload,
		type TaskPayload,
		titleForGoalCollection
	} from '$lib/models';

	interface Props {
		measure?: Container<MeasurePayload> | Container<SimpleMeasurePayload>;
		measures: Array<Container<MeasurePayload> | Container<SimpleMeasurePayload>>;
		containers: (Container<EffectPayload> | Container<GoalPayload> | Container<TaskPayload>)[];
		indicators: Container<IndicatorPayload>[];
		showMeasures?: boolean;
	}

	let { measure, measures, containers, indicators, showMeasures = false }: Props = $props();

	let goals = $derived(
		containersByHierarchyLevel(
			containers
				.filter((c) => isContainerWithPayloadType(payloadTypes.enum.goal, c))
				.filter(({ relation }) =>
					relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
				)
		)
	);

	let columns = $derived([
		...Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				addItemUrl: measure
					? addItemUrl([
							[overlayKey.enum.create, payloadTypes.enum.goal],
							['hierarchyLevel', String(hierarchyLevel)],

							[predicates.enum['is-part-of-measure'], measure.guid],
							['managedBy', measure.managed_by]
						])
					: undefined,
				containers: containers,
				key: `goals-${hierarchyLevel}`,
				title: titleForGoalCollection(containers, [...goals.keys()].length > 1 ? hierarchyLevel : 0)
			})),
		{
			addItemUrl: measure
				? addItemUrl([
						[overlayKey.enum.create, payloadTypes.enum.task],
						...(measure
							? [
									[predicates.enum['is-part-of-measure'], measure.guid],
									['managedBy', measure.managed_by]
								]
							: [])
					])
				: undefined,
			containers: containers.filter((c) => isContainerWithPayloadType(payloadTypes.enum.task, c)),
			key: 'tasks',
			title: $_('tasks')
		}
	]);

	let indicatorsByGuid = $derived(new Map(indicators.map((i) => [i.guid, i])));

	function addItemUrl(init: string[][]) {
		const params = new URLSearchParams(init);
		return `#${params.toString()}`;
	}
</script>

<Board>
	{#if showMeasures}
		<BoardColumn title={$_('measures')}>
			<div class="vertical-scroll-wrapper">
				{#each measures as c (c.guid)}
					<Card container={c} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/if}
	{#each columns as column (column.key)}
		<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
			<div class="vertical-scroll-wrapper">
				{#each column.containers as container (container.guid)}
					{#if isContainerWithPayloadType(payloadTypes.enum.goal, container)}
						{@const effect = containers
							.filter((container) =>
								isContainerWithPayloadType(payloadTypes.enum.effect, container)
							)
							.find((e) => isPartOf(container)(e))}
						{#if effect}
							{@const indicator = indicatorsByGuid.get(
								effect.relation.find(
									({ predicate }) => predicate === predicates.enum['is-measured-by']
								)?.object ?? ''
							)}
							{#if indicator}
								<Card
									{container}
									relatedContainers={[...measures, indicator, effect, container]}
									showRelationFilter
								/>
							{/if}
						{:else}
							<Card {container} showRelationFilter />
						{/if}
					{:else}
						<Card {container} showRelationFilter />
					{/if}
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
