<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import { goto } from '$app/navigation';
	import deleteContainer from '$lib/client/deleteContainer';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import { type CustomEventMap, payloadTypes } from '$lib/models';
	import { mayDeleteContainer } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		if (detail.result.payload.type === payloadTypes.enum.page) {
			await goto(`/${detail.result.payload.slug}`);
		}
	}

	async function handleDelete() {
		const response = await deleteContainer(container);
		if (response.ok) {
			await goto('/', { invalidateAll: true });
		}
	}
</script>

<Layout>
	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<div class="content-details masked-overflow">
				<ContainerForm {container} on:submitSuccessful={afterSubmit} />
			</div>
			<footer class="content-footer">
				<Visibility {container} />
				<div class="content-actions">
					<button class="primary" form="container-form" type="submit">{$_('save')}</button>
					<a class="button" href="/{container.payload.slug}">{$_('cancel')}</a>
					{#if $mayDeleteContainer(container)}
						<button class="delete quiet" title={$_('delete')} type="button" on:click={handleDelete}>
							<Trash />
						</button>
					{/if}
				</div>
			</footer>
		</div>
		<Help slug={`${container.payload.type.replace('_', '-')}-edit`} />
	</svelte:fragment>
</Layout>
