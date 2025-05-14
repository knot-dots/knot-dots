<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		computeColumnTitleForGoals,
		goalsByHierarchyLevel,
		type IndicatorContainer,
		isEffectContainer,
		isGoalContainer,
		isPartOf,
		isTaskContainer,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		overlayKey,
		payloadTypes,
		predicates,
		type SimpleMeasureContainer
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let measure: MeasureContainer | SimpleMeasureContainer | undefined = undefined;
	export let measures: Array<MeasureContainer | SimpleMeasureContainer>;
	export let containers: MeasureMonitoringContainer[];
	export let indicators: IndicatorContainer[];
	export let showMeasures = false;

	$: goals = goalsByHierarchyLevel(
		containers
			.filter(isGoalContainer)
			.filter(({ relation }) =>
				relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
			)
	);

	$: columns = [
		...Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				...(measure && $mayCreateContainer(payloadTypes.enum.goal, measure.managed_by)
					? {
							addItemUrl: addItemUrl([
								[overlayKey.enum.create, payloadTypes.enum.goal],
								['hierarchyLevel', String(hierarchyLevel)],
								[predicates.enum['is-part-of-measure'], measure.guid]
							])
						}
					: undefined),
				containers: containers,
				key: `goals-${hierarchyLevel}`,
				title: computeColumnTitleForGoals(containers)
			})),
		{
			...(measure && $mayCreateContainer(payloadTypes.enum.task, measure.managed_by)
				? {
						addItemUrl: addItemUrl([
							[overlayKey.enum.create, payloadTypes.enum.task],
							[predicates.enum['is-part-of-measure'], measure.guid]
						])
					}
				: undefined),
			containers: containers.filter(isTaskContainer),
			key: 'tasks',
			title: 'tasks'
		}
	];

	$: indicatorsByGuid = new Map(indicators.map((i) => [i.guid, i]));

	function addItemUrl(init: string[][]) {
		const params = new URLSearchParams(init);
		return `#${params.toString()}`;
	}
</script>

<Board>
	{#if showMeasures}
		<BoardColumn title={$_('measures')}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each measures as c}
					<Card container={c} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/if}
	{#each columns as column (column.key)}
		<BoardColumn addItemUrl={column.addItemUrl} title={$_(column.title)}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each column.containers as container}
					{#if isGoalContainer(container)}
						{@const effect = containers
							.filter(isEffectContainer)
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
