<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { isTermContainer, predicates, type CategoryContainer, type Container } from '$lib/models';
	import { applicationState, overlayHistory } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: CategoryContainer;
		relatedContainers: Container[];
	}

	let { container, relatedContainers }: Props = $props();

	const linkedTerms = $derived(
		relatedContainers
			.filter(isTermContainer)
			.filter(({ relation }) =>
				relation.some(
					({ predicate, object }) =>
						predicate === predicates.enum['is-part-of-category'] && object === container.guid
				)
			)
	);

	const sameOrganization = $derived(page.data.currentOrganization?.guid === container.organization);
	const isDefaultCategory =
		'default' in container.payload && (container.payload as Record<string, unknown>).default === true;

	// svelte-ignore non_reactive_update
	let confirmDeleteDialog: HTMLDialogElement;

	async function deleteTarget(target: Container) {
		const response = await deleteContainer(target);
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.message ?? 'Failed to delete');
		}
	}

	async function handleDelete(event: SubmitEvent) {
		event?.preventDefault?.();
		try {
			for (const term of linkedTerms) {
				await deleteTarget(term);
			}
			await deleteTarget(container);

			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
				await goto(`#${newParams.toString()}`, { invalidateAll: true });
			} else {
				await goto('#', { invalidateAll: true });
			}
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			confirmDeleteDialog.close();
		}
	}
</script>

{#if $applicationState.containerDetailView.editable && sameOrganization && !isDefaultCategory}
	<button
		class="delete quiet"
		type="button"
		onclick={() => confirmDeleteDialog.showModal()}
		{@attach tooltip($_('delete'))}
	>
		<TrashBin />
	</button>

	<ConfirmDeleteDialog
		bind:dialog={confirmDeleteDialog}
		handleSubmit={handleDelete}
		{container}
		relatedContainers={[...relatedContainers, ...linkedTerms]}
	/>
{/if}
