<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import deleteContainer from '$lib/client/deleteContainer';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
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

<div class="detail-page-content">
	<header class="content-header">
		<label>
			{$_(`${container.payload.type}`)}
			<input name="name" type="text" bind:value={container.payload.name} required />
		</label>
	</header>
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
