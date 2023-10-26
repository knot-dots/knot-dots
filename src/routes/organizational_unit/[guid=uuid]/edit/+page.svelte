<script lang="ts">
	import { goto } from '$app/navigation';
	import OrganizationalUnitForm from '$lib/components/OrganizationalUnitForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;

	$: isPartOfOptions = data.isPartOfOptions;

	async function afterSubmit() {
		await goto(`../${container.guid}`);
	}

	async function afterDelete() {
		await goto(`/organization/${data.currentOrganization.guid}/organizational_units`, {
			invalidateAll: true
		});
	}
</script>

<div class="detail-page-content">
	<OrganizationalUnitForm
		{container}
		{isPartOfOptions}
		on:submitSuccessful={afterSubmit}
		on:deleteSuccessful={afterDelete}
	/>
</div>
