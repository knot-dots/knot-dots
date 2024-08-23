<script lang="ts">
	import Pencil from '~icons/heroicons/pencil-solid';
	import Layout from '$lib/components/Layout.svelte';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar slot="sidebar" />

	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<header class="content-header">
				<h2>
					{data.container.payload.title}
					{#if $ability.can('update', data.container)}
						<a href="/page/{data.container.guid}/edit" class="button button-square quiet">
							<Pencil />
						</a>
					{/if}
				</h2>
			</header>
			<div class="content-details masked-overflow">
				<PageDetailView container={data.container} />
			</div>
		</div>
	</svelte:fragment>
</Layout>
