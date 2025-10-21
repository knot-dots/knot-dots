<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import { env } from '$env/dynamic/public';
	import {
		type AnyContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import deleteContainer from '$lib/client/deleteContainer';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface Props {
		children: Snippet;
		container: OrganizationContainer | OrganizationalUnitContainer;
		relatedContainers: AnyContainer[];
		dialog: HTMLDialogElement;
		title: string;
	}

	let { children, container, relatedContainers, dialog = $bindable(), title }: Props = $props();

	let confirmDelete = $state(false);

	async function handleConfirmDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			if (container.guid == container.organization) {
				window.location.href = env.PUBLIC_BASE_URL + '/all/page';
			} else {
				await goto(resolve('/[[guid=uuid]]/all/page', { guid: container.organization }));
				await invalidateAll();
			}
			confirmDelete = false;
		}
	}
</script>

<dialog bind:this={dialog}>
	<div>
		{#if confirmDelete}
			<form class="details" method="dialog" onsubmit={() => handleConfirmDelete(container)}>
				<button
					class="action-button action-button--size-s"
					onclick={() => {
						confirmDelete = false;
						dialog.close();
					}}
					type="button"
				>
					<Close />
					<span class="is-visually-hidden">{$_('cancel')}</span>
				</button>

				<h2>
					{$_('confirm_delete_dialog.heading', {
						values: {
							title: container.payload.name
						}
					})}
				</h2>

				<p>
					{$_('confirm_delete_dialog.message', {
						values: {
							count: relatedContainers.length
						}
					})}
				</p>

				<button class="button-primary button-xs" type="submit">
					{$_('confirm_delete_dialog.button', {
						values: {
							title: container.payload.name
						}
					})}
				</button>
			</form>
		{:else}
			<p class="dialog-actions">
				<span>{title}</span>

				<button class="button-xs button-alternative" onclick={() => dialog.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</p>

			<div class="details">
				{@render children()}

				<footer>
					<button
						class="button button-xs button-red"
						onclick={(e) => {
							e.preventDefault();
							confirmDelete = true;
						}}
						type="button"
					>
						<TrashBin />
						{$_('delete.name', { values: { name: container.payload.name } })}
					</button>
				</footer>
			</div>
		{/if}
	</div>
</dialog>

<style>
	dialog {
		--content-width: 100%;

		width: calc(min(54rem, 100vw));
	}

	dialog > * {
		min-width: 30rem;
	}

	.dialog-actions {
		align-items: center;
		background-color: white;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.dialog-actions span {
		color: var(--color-gray-500);
	}

	footer {
		padding: 1.5rem;
	}

	form {
		padding: 3rem;
	}

	h2 {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 0.5rem;
	}

	p {
		color: var(--color-gray-500);
		margin: 0 0 1.5rem;
	}

	.action-button {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
	}

	.button-primary {
		display: block;
		width: 100%;
	}
</style>
