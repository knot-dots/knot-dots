<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

</script>

<Layout>
	{#snippet header()}
		<Header search />
	{/snippet}

	{#snippet main()}
		<Board>
			<BoardColumn addItemUrl="#create=category&level=0" title={$_('categories.columns.root')}>
				<MaybeDragZone containers={data.containers} />
			</BoardColumn>
		</Board>

		<Help slug="categories" />
	{/snippet}
</Layout>
