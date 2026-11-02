<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import TeamRoster from '$lib/components/TeamRoster.svelte';
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
				<TeamRoster
					container={data.container}
					mayManage={data.mayManage}
					parent={data.parent}
					users={data.users}
				/>
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
