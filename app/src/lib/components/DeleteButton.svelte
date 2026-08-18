<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import type { AnyPayload, Container } from '$lib/models';
	import { applicationState, mayDeleteContainer, overlayHistory } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, relatedContainers }: Props = $props();

	// svelte-ignore non_reactive_update
	let confirmDeleteDialog: HTMLDialogElement;

	let overlay = getContext('overlay');

	async function handleDelete(c: Container<AnyPayload>) {
		const response = await deleteContainer(c);
		if (response.ok) {
			if (overlay) {
				if ($overlayHistory.length > 1) {
					$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
					const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
					await goto(`#${newParams.toString()}`, { invalidateAll: true });
				} else {
					await goto('#', { invalidateAll: true });
				}
			} else if (container.guid == container.organization) {
				window.location.href = env.PUBLIC_BASE_URL + '/all/page';
			} else {
				await goto(resolve('/[guid=uuid]/all/page', { guid: container.organization }));
				await invalidateAll();
			}
		}
		confirmDeleteDialog.close();
	}
</script>

{#if $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
	<button
		class="button-alternative system-danger"
		type="button"
		onclick={() => confirmDeleteDialog.showModal()}
		{@attach tooltip($_('delete'))}
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
