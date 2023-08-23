<script lang="ts">
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<OrganizationDetailView {...data} />
