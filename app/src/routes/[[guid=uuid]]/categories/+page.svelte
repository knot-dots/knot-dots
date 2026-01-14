<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { predicates } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['contributes-to']
		]
	});

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
			<BoardColumn addItemUrl="#create=term" title={$_('category.terms.heading')}>
				<MaybeDragZone containers={data.terms} />
			</BoardColumn>
		</Board>

		<Help slug="categories" />
	{/snippet}
</Layout>
