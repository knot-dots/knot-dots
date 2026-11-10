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
					<Members
						admins={data.admins}
						adminTeams={data.adminTeams}
						container={data.container}
						grants={data.grants}
						inheritedSections={data.inheritedSections}
						mayManageOrganizationUsers={data.mayManageOrganizationUsers}
						teams={data.teams}
						users={data.users}
					/>
				</div>
			</div>

			<ContextTabs slug="members" />
		{/snippet}
	</FullscreenLayout>
</PageLayout>

<style>
	/* the matrix below the title scrolls on its own, so the page does not */
	.details {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.details-title {
		flex-shrink: 0;
	}

	.details-section {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
</style>
