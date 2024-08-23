<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dialog from '$lib/components/Dialog.svelte';
	import { type AnyContainer, type Container, findDescendants } from '$lib/models';

	export let dialog: HTMLDialogElement;
	export let handleSubmit: (event: SubmitEvent) => void;
	export let container: AnyContainer;
	export let relatedContainers: Container[];
</script>

<Dialog bind:dialog>
	<form on:submit|preventDefault={handleSubmit}>
		<h3>
			{$_('confirm_delete_dialog.heading', {
				values: {
					title: 'title' in container.payload ? container.payload.title : container.payload.name
				}
			})}
		</h3>
		<p>
			{$_('confirm_delete_dialog.message', {
				values: { count: 1 + findDescendants(container, relatedContainers).length }
			})}
		</p>
		<button class="primary" type="submit"
			>{$_('confirm_delete_dialog.button', {
				values: {
					title: 'title' in container.payload ? container.payload.title : container.payload.name
				}
			})}</button
		>
	</form>
</Dialog>

<style>
	h3 {
		margin: 0 0 1rem;
	}

	p {
		margin-bottom: 1rem;
	}

	button {
		display: block;
		width: 100%;
	}
</style>
