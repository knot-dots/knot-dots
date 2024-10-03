<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		type IndicatorContainer,
		isEffectContainer,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		payloadTypes,
		predicates,
		type SimpleMeasureContainer
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: MeasureContainer | SimpleMeasureContainer;
	export let containers: MeasureMonitoringContainer[];
	export let indicators: IndicatorContainer[];

	setContext('mayShowRelationButton', true);

	const columns = [
		{
			title: 'measure_results',
			payloadType: payloadTypes.enum.measure_result
		},
		{
			title: 'milestones',
			payloadType: payloadTypes.enum.milestone
		},
		{
			title: 'tasks',
			payloadType: payloadTypes.enum.task
		}
	];

	$: indicatorsByRevision = new Map(indicators.map((i) => [i.revision, i]));
</script>

<Board>
	<BoardColumn title={$_('board.measure_monitoring.column.effects')}>
		<div class="vertical-scroll-wrapper masked-overflow">
			{#each containers.filter(isEffectContainer) as effect}
				{@const indicator = indicatorsByRevision.get(
					effect.relation.find(({ predicate }) => predicate === predicates.enum['is-measured-by'])
						?.object ?? 0
				)}
				{#if indicator}
					<Card container={effect} relatedContainers={[container, indicator, effect]} />
				{/if}
			{/each}
		</div>
	</BoardColumn>
	{#each columns as column (column.title)}
		<BoardColumn
			addItemUrl={$mayCreateContainer(column.payloadType, container.managed_by)
				? `#create=${column.payloadType}&is-part-of-measure=${container.revision}&managed-by=${container.managed_by}`
				: undefined}
			title={$_(column.title)}
		>
			<MaybeDragZone containers={containers.filter((c) => c.payload.type === column.payloadType)} />
		</BoardColumn>
	{/each}
</Board>
