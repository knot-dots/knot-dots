<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		type IndicatorContainer,
		isEffectContainer,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		payloadTypes,
		predicates,
		type SimpleMeasureContainer
	} from '$lib/models';

	export let measures: Array<MeasureContainer | SimpleMeasureContainer>;
	export let containers: MeasureMonitoringContainer[];
	export let indicators: IndicatorContainer[];

	const columns = [
		{
			title: 'measure_results',
			payloadType: [payloadTypes.enum.measure_result, payloadTypes.enum.effect] as string[]
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
	{#if measures.length > 1}
		<BoardColumn title={$_('measures')}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each measures as c}
					<Card container={c} />
				{/each}
			</div>
		</BoardColumn>
	{/if}
	{#each columns as column (column.title)}
		<BoardColumn title={$_(column.title)}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each containers.filter(({ payload }) => column.payloadType.includes(payload.type)) as c}
					{#if isEffectContainer(c)}
						{@const indicator = indicatorsByRevision.get(
							c.relation.find(({ predicate }) => predicate === predicates.enum['is-measured-by'])
								?.object ?? 0
						)}
						{#if indicator}
							<Card container={c} relatedContainers={[...measures, indicator, c]} />
						{/if}
					{:else}
						<Card container={c} />
					{/if}
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
