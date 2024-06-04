<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		type IndicatorContainer,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: MeasureContainer;
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

	$: indicatorsByGuid = new Map(indicators.map((i) => [i.guid, i]));
</script>

<Board>
	<BoardColumn title={$_('board.measure_monitoring.column.effects')}>
		<div class="vertical-scroll-wrapper masked-overflow">
			{#each container.payload.effect as effect}
				{@const indicator = indicatorsByGuid.get(effect.indicator)}
				{#if indicator}
					<Card container={indicator} relatedContainers={[container]} />
				{/if}
			{/each}
		</div>
	</BoardColumn>
	{#each columns as column (column.title)}
		<BoardColumn
			addItemUrl={$mayCreateContainer(column.payloadType)
				? `#create=${column.payloadType}&is-part-of-measure=${container.revision}`
				: undefined}
			title={$_(column.title)}
		>
			<MaybeDragZone containers={containers.filter((c) => c.payload.type === column.payloadType)} />
		</BoardColumn>
	{/each}
</Board>
