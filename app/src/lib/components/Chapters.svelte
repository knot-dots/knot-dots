<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import { type Container, isPartOf, payloadTypes } from '$lib/models';

	export let containers: Container[];
	export let containersWithIndicatorContributions: Container[] = [];

	const columns = [
		{
			title: 'payload_group.long_term_goals',
			payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
		},
		{ title: 'payload_group.strategic_goals', payloadType: [payloadTypes.enum.strategic_goal] },
		{
			title: 'payload_group.measurable_goals',
			payloadType: [payloadTypes.enum.operational_goal]
		},
		{
			title: 'payload_group.implementation',
			payloadType: [
				payloadTypes.enum.measure,
				payloadTypes.enum.simple_measure,
				payloadTypes.enum.resolution
			]
		}
	];
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn title={$_(column.title)}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each containers.filter((c) => column.payloadType.findIndex((payloadType) => payloadType === c.payload.type) > -1) as container}
					<Card
						{container}
						relatedContainers={containersWithIndicatorContributions.filter(isPartOf)}
						showRelationFilter
					/>
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
