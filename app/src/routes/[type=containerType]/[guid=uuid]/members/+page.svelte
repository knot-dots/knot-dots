<script lang="ts">
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import Layout from '$lib/components/Layout.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<svelte:fragment slot="main">
		<div class="details details-editable">
			<h2 class="details-title">
				{'title' in data.container.payload
					? data.container.payload.title
					: data.container.payload.name}
				<button class="action-button" type="button" on:click={() => window.history.back()}>
					<ChevronLeft />
				</button>
			</h2>

			<div class="details-tab">
				<Members container={data.container} users={data.users} />
			</div>
		</div>
	</svelte:fragment>
</Layout>

<style>
	.details {
		flex: 1 1;
	}
</style>
