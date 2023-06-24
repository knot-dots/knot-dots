<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { containerTypes, predicates } from '$lib/models';
	import type { Container } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	const columns = [
		{ title: 'strategies', containerType: containerTypes.enum.strategy },
		{ title: 'models', containerType: containerTypes.enum.model },
		{ title: 'strategic_goals', containerType: containerTypes.enum.strategic_goal },
		{ title: 'operational_goals', containerType: containerTypes.enum.operational_goal },
		{ title: 'measures', containerType: containerTypes.enum.measure }
	];

	function isPartOf(container: Container) {
		return function (candidate: Container) {
			return (
				container.relation.findIndex(
					(r) => r.predicate === predicates.enum['is-part-of'] && r.subject === candidate.revision
				) > -1
			);
		};
	}
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn title={$_(column.title)} addItemUrl={`/${column.containerType}/new`}>
			{#each data.containers.filter((c) => c.type === column.containerType) as container}
				<Card {container} relatedContainers={data.containers.filter(isPartOf(container))} />
			{/each}
		</BoardColumn>
	{/each}
</Board>

{#if data.containerPreviewData}
	<Overlay
		containerPreviewData={data.containerPreviewData}
		isPartOfOptions={data.isPartOfOptions ?? []}
		relatedContainers={data.relatedContainers ?? []}
	/>
{/if}
