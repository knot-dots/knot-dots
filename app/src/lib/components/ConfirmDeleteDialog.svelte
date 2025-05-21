<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dialog from '$lib/components/Dialog.svelte';
	import { type AnyContainer, type Container, findDescendants, predicates } from '$lib/models';

	interface Props {
		dialog: HTMLDialogElement;
		handleSubmit: (event: SubmitEvent) => void;
		container: AnyContainer;
		relatedContainers: Container[];
	}

	let { dialog = $bindable(), handleSubmit, container, relatedContainers }: Props = $props();

	function preventDefault(fn: (event: SubmitEvent) => void) {
		return function (this: HTMLDialogElement, event: SubmitEvent) {
			event.preventDefault();
			fn.call(this, event);
		};
	}
</script>

<Dialog bind:dialog>
	<form onsubmit={preventDefault(handleSubmit)}>
		<h3>
			{$_('confirm_delete_dialog.heading', {
				values: {
					title: 'title' in container.payload ? container.payload.title : container.payload.name
				}
			})}
		</h3>
		<p>
			{$_('confirm_delete_dialog.message', {
				values: {
					count:
						1 + findDescendants(container, relatedContainers, predicates.enum['is-part-of']).length
				}
			})}
		</p>
		<button class="primary" type="submit">
			{$_('confirm_delete_dialog.button', {
				values: {
					title: 'title' in container.payload ? container.payload.title : container.payload.name
				}
			})}
		</button>
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
