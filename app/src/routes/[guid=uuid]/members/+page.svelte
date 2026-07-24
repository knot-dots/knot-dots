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
		<Header workspaceOptions={[]} />
	{/snippet}

	{#snippet main()}
		<section class="details">
			<header class="details-section">
				<h1 class="details-title">
					{'title' in data.container.payload
						? data.container.payload.title
						: data.container.payload.name}
					<button class="action-button" type="button" onclick={() => window.history.back()}>
						<ChevronLeft />
					</button>
				</h1>
			</header>

			<div class="details-section">
				<Members container={data.container} users={data.users} />
			</div>
		</section>

		<ContextTabs slug="members" />
	{/snippet}
</Layout>

<style>
	.details {
		height: 100%;
		overflow-y: auto;
	}
</style>
