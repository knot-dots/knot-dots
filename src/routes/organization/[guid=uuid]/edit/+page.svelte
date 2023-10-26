<script lang="ts">
	import { goto } from '$app/navigation';
	import OrganizationForm from '$lib/components/OrganizationForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;

	async function afterSubmit() {
		await goto(`../${container.guid}`);
	}

	async function afterDelete() {
		await goto('/organizations');
	}
</script>

<div class="detail-page-content">
	<OrganizationForm
		{container}
		on:submitSuccessful={afterSubmit}
		on:deleteSuccessful={afterDelete}
	/>
</div>
