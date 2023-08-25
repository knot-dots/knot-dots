<script lang="ts">
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<OrganizationDetailView {...data} />

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
