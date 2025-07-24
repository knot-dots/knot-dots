<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import { type AnyContainer, type Container, findDescendants, predicates } from '$lib/models';

	interface Props {
		dialog: HTMLDialogElement;
		handleSubmit: (event: SubmitEvent) => void;
		container: AnyContainer;
		relatedContainers: Container[];
	}

	let { dialog = $bindable(), handleSubmit, container, relatedContainers }: Props = $props();
</script>

<dialog bind:this={dialog}>
	<form method="dialog" onsubmit={handleSubmit}>
		<button
			class="action-button action-button--size-s"
			onclick={() => dialog.close()}
			type="button"
		>
			<Close />
			<span class="is-visually-hidden">{$_('cancel')}</span>
		</button>

		<h2>
			{$_('confirm_delete_dialog.heading', {
				values: {
					title: 'title' in container.payload ? container.payload.title : container.payload.name
				}
			})}
		</h2>

		<p>
			{$_('confirm_delete_dialog.message', {
				values: {
					count:
						1 + findDescendants(container, relatedContainers, predicates.enum['is-part-of']).length
				}
			})}
		</p>

		<button class="button-primary button-xs" type="submit">
			{$_('confirm_delete_dialog.button', {
				values: {
					title: 'title' in container.payload ? container.payload.title : container.payload.name
				}
			})}
		</button>
	</form>
</dialog>

<style>
	form {
		max-width: 30rem;
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
