<script lang="ts">
	import { _ } from 'svelte-i18n';
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
	<header class="content-header">
		<label>
			{$_(`${container.payload.type}`)}
			<input name="name" type="text" bind:value={container.payload.name} required />
		</label>
	</header>
	<div class="content-details">
		<OrganizationForm
			{container}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		/>
	</div>
</div>
