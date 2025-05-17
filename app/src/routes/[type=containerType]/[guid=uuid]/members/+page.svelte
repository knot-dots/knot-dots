<script lang="ts">
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import Layout from '$lib/components/Layout.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<header class="content-header">
				<h2>
					{'title' in data.container.payload
						? data.container.payload.title
						: data.container.payload.name}
					<button class="button-square quiet" type="button" on:click={() => window.history.back()}>
						<ChevronLeft />
					</button>
				</h2>
			</header>
			<div class="content-details masked-overflow">
				<Members container={data.container} users={data.users} />
			</div>
		</div>
	</svelte:fragment>
</Layout>
