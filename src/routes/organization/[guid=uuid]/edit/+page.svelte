<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import deleteContainer from '$lib/client/deleteContainer';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import { mayDelete } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;

	async function afterSubmit() {
		await goto(`../${container.guid}`);
	}

	async function handleDelete() {
		const response = await deleteContainer(container);
		if (response.ok) {
			await goto('/organizations');
		}
	}
</script>

<Layout>
	<Sidebar helpSlug="organization-edit" slot="sidebar">
		<OrganizationTabs container={data.container} />
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<div class="content-details masked-overflow">
				<ContainerForm {container} isPartOfOptions={[]} on:submitSuccessful={afterSubmit} />
			</div>
			<footer class="content-footer">
				<Visibility {container} />
				<div class="content-actions">
					<button class="primary" form="container-form" type="submit">{$_('save')}</button>
					<a class="button" href=".">{$_('cancel')}</a>
					{#if mayDelete(container)}
						<button class="delete quiet" title={$_('delete')} type="button" on:click={handleDelete}>
							<Icon src={Trash} size="20" />
						</button>
					{/if}
				</div>
			</footer>
		</div>
	</svelte:fragment>
</Layout>
