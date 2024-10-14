<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		type IndicatorContainer,
		isEffectContainer,
		isMeasureResultContainer,
		isPartOf,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		payloadTypes,
		predicates,
		type SimpleMeasureContainer
	} from '$lib/models';

	export let measures: Array<MeasureContainer | SimpleMeasureContainer>;
	export let containers: MeasureMonitoringContainer[];
	export let indicators: IndicatorContainer[];
	export let showMeasures = false;

	const columns = [
		{
			title: 'measure_results',
			payloadType: [payloadTypes.enum.measure_result] as string[]
		},
		{
			title: 'milestones',
			payloadType: [payloadTypes.enum.milestone] as string[]
		},
		{
			title: 'tasks',
			payloadType: [payloadTypes.enum.task] as string[]
		}
	];

	$: indicatorsByRevision = new Map(indicators.map((i) => [i.revision, i]));
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
	{#each columns as column (column.title)}
		<BoardColumn title={$_(column.title)}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each containers.filter(({ payload }) => column.payloadType.includes(payload.type)) as c}
					{#if isMeasureResultContainer(c)}
						{@const effect = containers.filter(isEffectContainer).find((e) => isPartOf(c)(e))}
						{#if effect}
							{@const indicator = indicatorsByRevision.get(
								effect.relation.find(
									({ predicate }) => predicate === predicates.enum['is-measured-by']
								)?.object ?? 0
							)}
							{#if indicator}
								<Card
									container={c}
									relatedContainers={[...measures, indicator, effect, c]}
									showRelationFilter
								/>
							{/if}
						{:else}
							<Card container={c} showRelationFilter />
						{/if}
					{:else}
						<Card container={c} showRelationFilter />
					{/if}
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
