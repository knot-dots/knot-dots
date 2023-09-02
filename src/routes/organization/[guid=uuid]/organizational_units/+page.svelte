<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	let byLevel: Map<number, OrganizationalUnitContainer[]>;

	$: {
		byLevel = new Map<number, OrganizationalUnitContainer[]>();

		for (const level of [1, 2, 3, 4]) {
			byLevel.set(
				level,
				data.containers.filter(({ payload }) => payload.level === level)
			);
		}
	}
</script>

<Board>
	{#each byLevel.entries() as [level, containers]}
		<BoardColumn
			title={$_('organizational_unit_level', { values: { level } })}
			addItemUrl={`/organizational_unit/new?level=${level}`}
		>
			{#each containers as container}
				<OrganizationCard {container} showRelationFilter />
			{/each}
		</BoardColumn>
	{/each}
</Board>
