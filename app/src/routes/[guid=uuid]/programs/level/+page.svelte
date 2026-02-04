<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { levels, predicates } from '$lib/models';
	import type { CategoryOptions } from '$lib/categoryOptions';
	import type { PageProps } from './$types';

	type PagePropsWithCategories = Omit<PageProps, 'data'> & {
		data: PageProps['data'] & {
			facetLabels?: Map<string, string>;
			categoryOptions?: CategoryOptions | null;
		};
	};

	let { data }: PagePropsWithCategories = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-superordinate-of']
		]
	});
</script>

<Layout>
	{#snippet header()}
		<Header
			facets={data.facets}
			facetLabels={data.facetLabels}
			categoryOptions={data.categoryOptions}
			search
		/>
	{/snippet}

	{#snippet main()}
		<Board>
			{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption (levelOption)}
				<BoardColumn addItemUrl={`#create=program&level=${levelOption}`} title={$_(levelOption)}>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'level' in c.payload && c.payload.level === levelOption
						)}
					/>
				</BoardColumn>
			{/each}
		</Board>

		<Help slug="programs-level" />
	{/snippet}
</Layout>
