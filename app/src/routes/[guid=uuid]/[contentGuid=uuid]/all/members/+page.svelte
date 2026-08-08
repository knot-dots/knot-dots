<script lang="ts">
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<PageLayout>
	<FullscreenLayout>
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
	</FullscreenLayout>
</PageLayout>

<style>
	.details {
		height: 100%;
		overflow-y: auto;
	}
</style>
