<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		type MeasureContainer,
		type MeasureMonitoringContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: MeasureContainer;
	export let containers: MeasureMonitoringContainer[];

	setContext('mayShowRelationButton', true);

	const columns = [
		{
			title: 'measure_results',
			payloadType: payloadTypes.enum.measure_result
		},
		{
			title: 'measure_milestones',
			payloadType: payloadTypes.enum.measure_milestone
		},
		{
			title: 'tasks',
			payloadType: payloadTypes.enum.task
		}
	];
</script>

<Board>
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
