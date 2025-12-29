<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ListType from '~icons/knotdots/tasks';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { type AnyContainer, visibility, listTypes, isCollectionContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';
	import { ability } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers = $bindable() }: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers)) as AnyContainer;

	let popover = createPopover({ label: $_('settings') });

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;
</script>

{#if $ability.can('update', container, 'visibility') && isCollectionContainer(container)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" use:popover.button>
			<ListType />
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				<div>
					{#each listTypes.options.map( (o) => ({ value: o, label: $_(`list_type.${o}`) }) ) as option (option.value)}
						<label>
							<input type="radio" value={option.value} bind:group={container.payload.listType} />
							<span class="truncated">{option.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		{/if}
	</div>
{/if}

<style>
	.dropdown-panel {
		border-radius: 16px;
	}
</style>
