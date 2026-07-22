<script lang="ts">
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<Layout>
	{#snippet header()}
		<Header />
	{/snippet}

	{#snippet main()}
		<div class="details">
			<h1 class="details-title">
				{data.container.payload.title}
				<button class="action-button" type="button" onclick={() => window.history.back()}>
					<ChevronLeft />
				</button>
			</h1>

			<div class="details-section">
				<Members container={data.container} users={data.users} />
			</div>
		</div>

		<ContextTabs slug="members" />
	{/snippet}
</Layout>

<style>
	.details {
		height: 100%;
		overflow-y: auto;
	}
</style>
