<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import { payloadTypes } from '$lib/models';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
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

<Layout>
	<svelte:fragment slot="main">
		<Board>
			{#each byLevel.entries() as [level, containers]}
				<BoardColumn
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.organizational_unit,
						data.container.guid
					)
						? `#create=${payloadTypes.enum.organizational_unit}&level=${level}`
						: undefined}
					title={$_('organizational_unit_level', { values: { level } })}
				>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each containers as container}
							<OrganizationCard {container} showRelationFilter />
						{/each}
					</div>
				</BoardColumn>
			{/each}
		</Board>
		<Help slug="organizational-units" />
	</svelte:fragment>
</Layout>
