<script lang="ts">
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<OrganizationDetailView
	container={data.container}
	measures={data.measures}
	strategies={data.strategies}
/>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
