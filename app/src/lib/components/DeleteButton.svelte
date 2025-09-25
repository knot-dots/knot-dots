<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import { goto } from '$app/navigation';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import type { AnyContainer, Container } from '$lib/models';
	import { applicationState, mayDeleteContainer, overlayHistory } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: Container[];
	}

	let { container, relatedContainers }: Props = $props();

	// svelte-ignore non_reactive_update
	let confirmDeleteDialog: HTMLDialogElement;

	async function handleDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
				await goto(`#${newParams.toString()}`, { invalidateAll: true });
			} else {
				await goto('#', { invalidateAll: true });
			}
		}
		confirmDeleteDialog.close();
	}
</script>

{#if $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
	<button
		aria-label={$_('delete')}
		class="delete quiet"
		type="button"
		onclick={() => confirmDeleteDialog.showModal()}
	>
		<TrashBin />
	</button>

	<ConfirmDeleteDialog
		bind:dialog={confirmDeleteDialog}
		handleSubmit={() => handleDelete(container)}
		{container}
		{relatedContainers}
	/>
{/if}
