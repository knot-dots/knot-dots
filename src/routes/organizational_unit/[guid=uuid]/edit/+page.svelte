<script lang="ts">
	import { _ } from 'svelte-i18n';
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
	<header class="content-header">
		<label>
			{$_(`${container.payload.type}`)}
			<input name="name" type="text" bind:value={container.payload.name} required />
		</label>
	</header>
	<div class="content-details">
		<OrganizationalUnitForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		/>
	</div>
</div>
