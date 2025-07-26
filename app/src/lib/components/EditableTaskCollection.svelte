<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import { type AnyContainer, isContainer, type TaskCollectionContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: TaskCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers }: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers));
</script>

{#if parentContainer && isContainer(parentContainer)}
	<h2 class="details-heading">{$_('tasks')}</h2>
	<EditableTaskCarousel container={parentContainer} {editable} />
{/if}
