<script lang="ts">
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="organization">
	<div class="detail-page-content organization-inner">
		<OrganizationDetailView
			container={data.container}
			measures={data.measures}
			strategies={data.strategies}
		/>
	</div>
</div>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}

<style>
	.organization {
		flex: 1 1;
		overflow-x: auto;
	}

	.organization-inner {
		min-width: calc(100vw - 24rem);
		overflow-y: auto;
	}
</style>
